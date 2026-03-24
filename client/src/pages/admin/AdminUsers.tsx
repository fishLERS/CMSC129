import React from 'react'
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { formatRoleLabel } from '../../utils/roleLabel'
import { setSuperAdmin } from '../../api/auth.api'
import { useTelemetry } from '../../hooks/useTelemetry'

interface UserData {
  uid: string
  displayName?: string
  email?: string
  role?: string
  isSuperAdmin?: boolean
  createdAt?: any
  requestedAdmin?: boolean
}

export default function AdminUsers() {
  const [users, setUsers] = React.useState<UserData[]>([])
  const [loading, setLoading] = React.useState(true)
  const [updating, setUpdating] = React.useState<string | null>(null)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [alertMessage, setAlertMessage] = React.useState<string | null>(null)
  const [alertType, setAlertType] = React.useState<'success' | 'error' | 'info'>('info')
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [confirmTitle, setConfirmTitle] = React.useState('')
  const [confirmMessage, setConfirmMessage] = React.useState('')
  const [confirmInput, setConfirmInput] = React.useState('')
  const [confirmSubmitting, setConfirmSubmitting] = React.useState(false)
  const confirmActionRef = React.useRef<null | (() => Promise<void>)>(null)
  const { measureActionLatency } = useTelemetry()

  React.useEffect(() => {
    const usersRef = collection(db, 'users')
    const unsubscribe = onSnapshot(
      usersRef,
      (snapshot) => {
        const list: UserData[] = []
        snapshot.forEach((docSnap) => {
          const data = docSnap.data()
          if (data.role === 'admin' || data.requestedAdmin) {
            list.push({
              uid: docSnap.id,
              displayName: data.displayName || '',
              email: data.email || '',
              role: data.role || 'student',
              isSuperAdmin: !!data.isSuperAdmin,
              createdAt: data.createdAt,
              requestedAdmin: !!data.requestedAdmin,
            })
          }
        })
        list.sort((a, b) => {
          if (a.role === 'admin' && b.role !== 'admin') return -1
          if (a.role !== 'admin' && b.role === 'admin') return 1
          return (a.email || '').localeCompare(b.email || '')
        })
        setUsers(list)
        setLoading(false)
      },
      (error) => {
        console.error('Failed to load users', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  async function applyAdminRoleChange(user: UserData, newRole: 'student' | 'admin') {
    try {
      setUpdating(user.uid)
      await measureActionLatency(
        'admin_users.set_role_firestore',
        () => updateDoc(doc(db, 'users', user.uid), { role: newRole, requestedAdmin: false }),
        { uid: user.uid, newRole }
      )
      setUsers((prev) =>
        prev.map((u) => (u.uid === user.uid ? { ...u, role: newRole, requestedAdmin: false } : u))
      )
      setAlertType('info')
      setAlertMessage(
        `Permissions updated for ${user.email || user.displayName || user.uid}. ` +
        `Please ask this user to re-login to refresh their token and apply new access.`
      )
    } catch (error) {
      console.error('Failed to update user role', error)
      setAlertType('error')
      setAlertMessage('Failed to update user role. Please try again.')
    } finally {
      setUpdating(null)
    }
  }

  async function applySuperAdminChange(user: UserData, nextValue: boolean) {
    try {
      setUpdating(user.uid)
      await measureActionLatency(
        'admin_users.set_super_admin',
        () => setSuperAdmin(user.uid, nextValue),
        { uid: user.uid, isSuperAdmin: nextValue }
      )
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === user.uid
            ? {
                ...u,
                role: nextValue ? 'admin' : u.role,
                isSuperAdmin: nextValue,
                requestedAdmin: false,
              }
            : u
        )
      )
      setAlertType('info')
      setAlertMessage(
        `Permissions updated for ${user.email || user.displayName || user.uid}. ` +
        `Please ask this user to re-login to refresh their token and apply new access.`
      )
    } catch (error: any) {
      console.error('Failed to update super admin role', error)
      setAlertType('error')
      setAlertMessage(error?.message || 'Failed to update super admin role. Please try again.')
    } finally {
      setUpdating(null)
    }
  }

  function openTypedConfirm(
    title: string,
    message: string,
    action: () => Promise<void>
  ) {
    setConfirmTitle(title)
    setConfirmMessage(message)
    setConfirmInput('')
    setConfirmSubmitting(false)
    confirmActionRef.current = action
    setConfirmOpen(true)
  }

  async function submitTypedConfirm() {
    if (!confirmActionRef.current) return
    try {
      setConfirmSubmitting(true)
      await confirmActionRef.current()
      setConfirmOpen(false)
      setConfirmInput('')
      confirmActionRef.current = null
    } finally {
      setConfirmSubmitting(false)
    }
  }

  async function toggleAdmin(user: UserData) {
    const newRole = user.role === 'admin' ? 'student' : 'admin'
    const displayName = user.email || user.displayName || user.uid

    if (newRole === 'student') {
      openTypedConfirm(
        'Confirm Admin Revocation',
        `You are about to revoke admin privileges from ${displayName}. Type CONFIRM to continue.`,
        () => applyAdminRoleChange(user, newRole)
      )
      return
    }

    if (!confirm(`Grant admin privileges to ${displayName}?`)) return
    await applyAdminRoleChange(user, newRole)
  }

  async function toggleSuperAdmin(user: UserData) {
    const nextValue = !user.isSuperAdmin
    const displayName = user.email || user.displayName || user.uid

    if (!nextValue) {
      openTypedConfirm(
        'Confirm Super Admin Demotion',
        `You are about to remove Super Admin access from ${displayName}. Type CONFIRM to continue.`,
        () => applySuperAdminChange(user, nextValue)
      )
      return
    }

    if (!confirm(`Promote ${displayName} to Super Admin?`)) return
    await applySuperAdminChange(user, nextValue)
  }

  function formatDate(ts: any) {
    try {
      if (!ts) return ''
      if (typeof ts.toDate === 'function') return ts.toDate().toLocaleDateString()
      if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts).toLocaleDateString()
      if (ts instanceof Date) return ts.toLocaleDateString()
    } catch {
      return ''
    }
    return ''
  }

  const filteredUsers = users.filter((user) => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return true
    return (
      (user.email || '').toLowerCase().includes(term) ||
      (user.displayName || '').toLowerCase().includes(term) ||
      user.uid.toLowerCase().includes(term)
    )
  })

  const adminCount = users.filter((u) => u.role === 'admin').length
  const superAdminCount = users.filter((u) => u.role === 'admin' && u.isSuperAdmin).length
  const pendingCount = users.filter((u) => u.role !== 'admin' && u.requestedAdmin).length

  return (
    <div className="p-6 space-y-6">
      {alertMessage && (
        <div className={`alert ${alertType === 'error' ? 'alert-error' : alertType === 'success' ? 'alert-success' : 'alert-info'}`}>
          <span>{alertMessage}</span>
          <button className="btn btn-sm" onClick={() => setAlertMessage(null)}>Close</button>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold">Admin Management</h1>
        <p className="text-base-content/70">Review admin accounts and pending requests using daisyUI cards.</p>
      </div>

      <div className="stats stats-vertical lg:stats-horizontal shadow bg-base-200 w-full">
        <div className="stat">
          <div className="stat-title">Total Accounts</div>
          <div className="stat-value">{users.length}</div>
          <div className="stat-desc">Admins & requests</div>
        </div>
        <div className="stat">
          <div className="stat-title">Current Admins</div>
          <div className="stat-value text-secondary">{adminCount}</div>
          <div className="stat-desc">Elevated users</div>
        </div>
        <div className="stat">
          <div className="stat-title">Super Admins</div>
          <div className="stat-value text-accent">{superAdminCount}</div>
          <div className="stat-desc">Override access</div>
        </div>
        <div className="stat">
          <div className="stat-title">Pending Requests</div>
          <div className="stat-value text-warning">{pendingCount}</div>
          <div className="stat-desc">Awaiting approval</div>
        </div>
      </div>

      <div className="card bg-base-200 shadow-xl">
        <div className="card-body flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="card-title text-lg mb-0">Search</h2>
            <p className="text-xs text-base-content/60">Filter by email, name, or user ID.</p>
          </div>
          <label className="form-control w-full md:w-80">
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="Search by email, name, or user ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="card bg-base-200 shadow-xl">
        <div className="card-body p-0">
          {loading ? (
            <div className="p-8 text-center">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-base-content/60">
                        {searchTerm ? 'No users match your search.' : 'No eligible users found.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.uid}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="avatar">
                              <div className="w-10 rounded-xl">
                                <img
                                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    user.displayName || user.email || 'User'
                                  )}&background=${user.role === 'admin' ? 'c7d2fe' : 'a5b4fc'}&color=${
                                    user.role === 'admin' ? '3730a3' : '312e81'
                                  }&bold=true`}
                                  alt={user.displayName || user.email || 'User'}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">{user.displayName || '(No name)'}</div>
                              <div className="text-xs text-base-content/60 font-mono">{user.uid.slice(0, 12)}...</div>
                            </div>
                          </div>
                        </td>
                        <td>{user.email || '—'}</td>
                        <td>
                          <span
                            className={`badge ${
                              user.role === 'admin'
                                ? user.isSuperAdmin
                                  ? 'badge-accent'
                                  : 'badge-secondary'
                                : 'badge-primary'
                            } badge-sm`}
                          >
                            {formatRoleLabel(user.role || 'student', !!user.isSuperAdmin)}
                          </span>
                          {user.requestedAdmin && user.role !== 'admin' ? (
                            <span className="badge badge-warning badge-sm ml-2">Requested</span>
                          ) : null}
                        </td>
                        <td className="text-sm">{formatDate(user.createdAt) || '—'}</td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <button
                              className={`btn btn-sm ${user.role === 'admin' ? 'btn-error' : 'btn-primary'}`}
                              onClick={() => toggleAdmin(user)}
                              disabled={updating === user.uid}
                            >
                              {updating === user.uid
                                ? 'Updating...'
                                : user.role === 'admin'
                                ? 'Revoke Admin'
                                : 'Grant Admin'}
                            </button>
                            {user.role === 'admin' && (
                              <button
                                className={`btn btn-sm ${user.isSuperAdmin ? 'btn-warning' : 'btn-accent'}`}
                                onClick={() => toggleSuperAdmin(user)}
                                disabled={updating === user.uid}
                              >
                                {updating === user.uid
                                  ? 'Updating...'
                                  : user.isSuperAdmin
                                  ? 'Remove Super'
                                  : 'Make Super'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card bg-base-200 shadow-xl">
        <div className="card-body space-y-3">
          <h3 className="card-title text-lg">About Admin Management</h3>
          <ul className="text-sm text-base-content/70 list-disc list-inside space-y-1">
            <li>This list shows current admins plus users who requested elevated access.</li>
            <li>Granting access promotes the user and clears their pending flag.</li>
            <li>Use Make Super/Remove Super to manage super-admin access through backend claims.</li>
            <li>Revoking access demotes the user back to student immediately.</li>
            <li>All changes are applied in real time via Firestore snapshots.</li>
          </ul>
        </div>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !confirmSubmitting) {
              setConfirmOpen(false)
              setConfirmInput('')
              confirmActionRef.current = null
            }
          }}
        >
          <div
            className="bg-base-100 p-4 rounded shadow max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">{confirmTitle}</h3>
            <p className="text-sm text-base-content/70 mt-1">{confirmMessage}</p>
            <div className="alert alert-warning mt-3">
              <span>Type CONFIRM to proceed with this destructive action.</span>
            </div>
            <input
              type="text"
              className="input input-bordered w-full mt-3"
              placeholder="Type CONFIRM"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              disabled={confirmSubmitting}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="btn"
                disabled={confirmSubmitting}
                onClick={() => {
                  setConfirmOpen(false)
                  setConfirmInput('')
                  confirmActionRef.current = null
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                disabled={confirmSubmitting || confirmInput.trim() !== 'CONFIRM'}
                onClick={submitTypedConfirm}
              >
                {confirmSubmitting ? 'Applying...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
