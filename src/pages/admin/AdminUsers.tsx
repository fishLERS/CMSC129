import React from 'react'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import AdminSidebar from '../../adminSidebar'

interface UserData {
  uid: string
  displayName?: string
  email?: string
  role?: string
  createdAt?: any
  requestedAdmin?: boolean
}

export default function AdminUsers() {
  const [users, setUsers] = React.useState<UserData[]>([])
  const [loading, setLoading] = React.useState(true)
  const [updating, setUpdating] = React.useState<string | null>(null)
  const [searchTerm, setSearchTerm] = React.useState('')

  React.useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    try {
      setLoading(true)
      const usersRef = collection(db, 'users')
      const snapshot = await getDocs(usersRef)
      const usersList: UserData[] = []
      snapshot.forEach((docSnap) => {
        const data = docSnap.data()
        // Only include admins and users who requested admin
        if (data.role === 'admin' || data.requestedAdmin === true) {
          usersList.push({
            uid: docSnap.id,
            displayName: data.displayName || '',
            email: data.email || '',
            role: data.role || 'student',
            createdAt: data.createdAt,
            requestedAdmin: data.requestedAdmin || false,
          })
        }
      })
      // Sort: admins first, then by email
      usersList.sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1
        if (a.role !== 'admin' && b.role === 'admin') return 1
        return (a.email || '').localeCompare(b.email || '')
      })
      setUsers(usersList)
    } catch (e) {
      console.error('Failed to load users', e)
    } finally {
      setLoading(false)
    }
  }

  async function toggleAdmin(user: UserData) {
    const newRole = user.role === 'admin' ? 'student' : 'admin'
    const confirmMsg = newRole === 'admin'
      ? `Grant admin privileges to ${user.email}?`
      : `Revoke admin privileges from ${user.email}?`
    
    if (!confirm(confirmMsg)) return

    try {
      setUpdating(user.uid)
      const userRef = doc(db, 'users', user.uid)
      await updateDoc(userRef, { role: newRole })
      setUsers((prev) =>
        prev.map((u) => (u.uid === user.uid ? { ...u, role: newRole } : u))
      )
    } catch (e) {
      console.error('Failed to update user role', e)
      alert('Failed to update user role. See console for details.')
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
      return ''
    } catch {
      return ''
    }
  }

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase()
    return (
      (u.email?.toLowerCase().includes(term) || '') ||
      (u.displayName?.toLowerCase().includes(term) || '') ||
      (u.uid.toLowerCase().includes(term))
    )
  })

  const adminCount = users.filter((u) => u.role === 'admin').length
  const pendingCount = users.filter((u) => u.role !== 'admin' && u.requestedAdmin).length

  return (
    <div>
      <AdminSidebar />
      <div style={{ marginLeft: 'var(--sidebar-width)' }} className="min-h-screen bg-transparent text-slate-200 p-4">
        <h1 className="text-2xl font-semibold mb-4">Admin Management</h1>

        <div className="max-w-6xl mx-auto">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-base-100 rounded-lg p-4 text-base-content">
              <div className="text-sm text-base-content/60">Total</div>
              <div className="text-2xl font-bold">{users.length}</div>
            </div>
            <div className="bg-base-100 rounded-lg p-4 text-base-content">
              <div className="text-sm text-base-content/60">Current Admins</div>
              <div className="text-2xl font-bold text-purple-500">{adminCount}</div>
            </div>
            <div className="bg-base-100 rounded-lg p-4 text-base-content">
              <div className="text-sm text-base-content/60">Pending Requests</div>
              <div className="text-2xl font-bold text-yellow-500">{pendingCount}</div>
            </div>
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by email, name, or user ID..."
              className="w-full md:w-96 rounded-md bg-base-100 border-0 p-3 text-sm text-base-content focus:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Users Table */}
          <div className="bg-base-100 rounded-lg overflow-hidden text-base-content">
            {loading ? (
              <div className="p-8 text-center">Loading users...</div>
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
                          {searchTerm ? 'No users match your search.' : 'No users found.'}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.uid}>
                          <td>
                            <div className="flex items-center gap-3">
                              <img
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'U')}&background=${user.role === 'admin' ? 'c7d2fe' : '60a5fa'}&color=${user.role === 'admin' ? '3730a3' : '1e3a8a'}&bold=true`}
                                alt=""
                                className="w-10 h-10 rounded-md"
                              />
                              <div>
                                <div className="font-medium">{user.displayName || '(No name)'}</div>
                                <div className="text-xs text-base-content/60 font-mono">{user.uid.slice(0, 12)}...</div>
                              </div>
                            </div>
                          </td>
                          <td>{user.email}</td>
                          <td>
                            {user.role === 'admin' ? (
                              <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">Admin</span>
                            ) : (
                              <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Student</span>
                            )}
                            {user.requestedAdmin && user.role !== 'admin' && (
                              <span className="ml-2 text-xs bg-yellow-600 text-white px-2 py-1 rounded">Requested Admin</span>
                            )}
                          </td>
                          <td className="text-sm">{formatDate(user.createdAt)}</td>
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

          {/* Info Note */}
          <div className="mt-4 p-4 bg-base-100 rounded-lg text-base-content">
            <h3 className="font-semibold text-sm mb-2">ℹ️ About Admin Management</h3>
            <ul className="text-sm text-base-content/70 list-disc list-inside space-y-1">
              <li>This page shows <strong>current admins</strong> and <strong>users who signed up requesting admin access</strong>.</li>
              <li><strong>Grant Admin:</strong> Promotes a pending user to admin role.</li>
              <li><strong>Revoke Admin:</strong> Demotes an admin back to student role.</li>
              <li>Role changes take effect immediately. The user may need to refresh their browser.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
