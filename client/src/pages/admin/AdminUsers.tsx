import React from 'react'
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'

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

  async function toggleAdmin(user: UserData) {
    const newRole = user.role === 'admin' ? 'student' : 'admin'
    const confirmMsg =
      newRole === 'admin'
        ? `Grant admin privileges to ${user.email || user.displayName || user.uid}?`
        : `Revoke admin privileges from ${user.email || user.displayName || user.uid}?`

    if (!confirm(confirmMsg)) return

    try {
      setUpdating(user.uid)
      await updateDoc(doc(db, 'users', user.uid), { role: newRole, requestedAdmin: false })
      setUsers((prev) =>
        prev.map((u) => (u.uid === user.uid ? { ...u, role: newRole, requestedAdmin: false } : u))
      )
    } catch (error) {
      console.error('Failed to update user role', error)
      setAlertMessage('Failed to update user role. Please try again.')
    } finally {
      setUpdating(null)
    }
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
        <div className="alert alert-error">
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
                            {user.role === 'admin'
                              ? user.isSuperAdmin
                                ? 'Super Admin'
                                : 'Admin'
                              : 'Student'}
                          </span>
                          {user.requestedAdmin && user.role !== 'admin' ? (
                            <span className="badge badge-warning badge-sm ml-2">Requested</span>
                          ) : null}
                        </td>
                        <td className="text-sm">{formatDate(user.createdAt) || '—'}</td>
                        <td>
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
            <li>Revoking access demotes the user back to student immediately.</li>
            <li>All changes are applied in real time via Firestore snapshots.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
