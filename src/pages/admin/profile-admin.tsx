import React from 'react'
import { useAuth } from '../../hooks/useAuth'
import { db } from '../../firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { auth } from '../../firebase'

function formatDate(ts: any) {
  try {
    if (!ts) return ''
    if (typeof ts.toDate === 'function') return ts.toDate().toLocaleString()
    if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts).toLocaleString()
    if (ts instanceof Date) return ts.toLocaleString()
    return String(ts)
  } catch {
    return ''
  }
}

export default function ProfileAdmin() {
  const { user } = useAuth()
  const [loading, setLoading] = React.useState(true)
  const [profile, setProfile] = React.useState<any>(null)
  const [editing, setEditing] = React.useState(false)
  const [displayName, setDisplayName] = React.useState('')
  const [staffId, setStaffId] = React.useState('')
  // password change state
  const [currentPassword, setCurrentPassword] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [passwordError, setPasswordError] = React.useState('')
  const [passwordSuccess, setPasswordSuccess] = React.useState('')

  React.useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const ref = doc(db, 'users', user.uid)
        const snap = await getDoc(ref)
        const data = snap.exists() ? snap.data() : null
        if (!cancelled) {
          setProfile(data)
          setDisplayName(user.displayName || data?.displayName || '')
          setStaffId(data?.staffId || '')
        }
      } catch (e) {
        console.error('Failed to load profile', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user])

  async function save() {
    if (!user) return
    try {
      setEditing(false)
      // update auth displayName
      if (displayName !== user.displayName) {
        await updateProfile(auth.currentUser as any, { displayName })
      }
      // update firestore users doc
      const ref = doc(db, 'users', user.uid)
      const updates: any = { displayName, staffId }
      await updateDoc(ref, updates)
      setProfile((p: any) => ({ ...(p || {}), displayName, staffId }))
    } catch (e) {
      console.error('Failed to save profile', e)
      alert('Failed to save profile; see console')
    }
  }

  async function changePassword() {
    setPasswordError('')
    setPasswordSuccess('')
    if (!newPassword || !confirmPassword) {
      setPasswordError('Please fill in both password fields.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.')
      return
    }
    try {
      const currentUser = auth.currentUser
      if (!currentUser || !currentUser.email) {
        setPasswordError('No authenticated user found.')
        return
      }
      // re-authenticate user before password update
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword)
      await reauthenticateWithCredential(currentUser, credential)
      await updatePassword(currentUser, newPassword)
      setPasswordSuccess('Password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e: any) {
      console.error('Failed to change password', e)
      if (e.code === 'auth/wrong-password') {
        setPasswordError('Current password is incorrect.')
      } else {
        setPasswordError(e.message || 'Failed to change password.')
      }
    }
  }

  if (!user) return <div className="min-h-screen grid place-items-center">Please login</div>

  return (
    <div className="min-h-screen bg-base-100 text-base-content p-4">
      <h1 className="text-2xl font-semibold mb-4">My Profile</h1>
      {loading ? (
        <div className="flex justify-center items-center h-96">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body items-center">
                <div className="avatar mb-4">
                  <div className="w-32 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                    <img
                      src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName||user?.email||'Admin')}&background=c7d2fe&color=3730a3&bold=true`}
                      alt="avatar"
                    />
                  </div>
                </div>
                <h2 className="card-title text-xl font-bold text-center">{profile?.displayName || user.displayName || 'Admin'}</h2>
                <div className="flex flex-col items-center gap-2 mt-2">
                  <span className="badge badge-lg badge-primary">Admin</span>
                  <span className="text-xs text-base-content/60">Staff ID: <span className="font-mono">{profile?.staffId || '-'}</span></span>
                  <span className="text-xs text-base-content/60">User ID: <span className="font-mono">{profile?.uid || user.uid}</span></span>
                </div>
                <div className="stats stats-vertical mt-6 w-full">
                  <div className="stat">
                    <div className="stat-title">Email</div>
                    <div className="stat-value text-sm truncate">{profile?.email || user.email}</div>
                    <div className="stat-desc flex items-center gap-1">
                      <span className="badge badge-success gap-1">Verified</span>
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Role</div>
                    <div className="stat-value text-sm">{profile?.role || 'admin'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details Card */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Information */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <h3 className="card-title text-lg">Account Information</h3>
                  {!editing ? (
                    <button className="btn btn-primary btn-sm gap-2" onClick={() => setEditing(true)}>
                      Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button 
                        className="btn btn-ghost btn-sm gap-2" 
                        onClick={() => { 
                          setEditing(false); 
                          setDisplayName(profile?.displayName || user.displayName || ''); 
                          setStaffId(profile?.staffId || '') 
                        }}
                      >
                        Cancel
                      </button>
                      <button className="btn btn-primary btn-sm gap-2" onClick={save}>
                        Save
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text flex items-center gap-2">
                        Full Name
                      </span>
                    </label>
                    <input
                      type="text"
                      className={`input input-bordered w-full ${editing ? '' : 'input-disabled'}`}
                      placeholder="Your Full Name"
                      value={editing ? displayName : (profile?.displayName || user.displayName || '')}
                      onChange={(e) => setDisplayName(e.target.value)}
                      readOnly={!editing}
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text flex items-center gap-2">
                        Staff ID
                      </span>
                    </label>
                    <input
                      type="text"
                      className={`input input-bordered w-full input-disabled ${editing ? 'bg-base-300 opacity-60' : ''}`}
                      placeholder="STAFF-XXXXX"
                      value={profile?.staffId || staffId || ''}
                      readOnly
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text flex items-center gap-2">
                        Role
                      </span>
                    </label>
                    <input
                      type="text"
                      className={`input input-bordered w-full input-disabled ${editing ? 'bg-base-300 opacity-60' : ''}`}
                      value={profile?.role || 'admin'}
                      readOnly
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text flex items-center gap-2">
                        User ID
                      </span>
                    </label>
                    <input
                      type="text"
                      className={`input input-bordered w-full input-disabled font-mono text-xs ${editing ? 'bg-base-300 opacity-60' : ''}`}
                      value={profile?.uid || user.uid}
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Email Section */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-lg">
                  Email Address
                </h3>
                <div className="flex items-center gap-4 p-4 bg-base-300 rounded-lg mt-2">
                  <div className="avatar placeholder">
                    <div className="bg-primary text-primary-content rounded-full w-10 h-10 flex items-center justify-center">
                      📧
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{profile?.email || user.email}</p>
                    <p className="text-xs text-base-content/60">Primary email address</p>
                  </div>
                  <span className="badge badge-success gap-1">
                    Verified
                  </span>
                </div>
              </div>
            </div>

            {/* Change Password Section */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-lg">
                  Change Password
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Current Password</span>
                    </label>
                    <input
                      type="password"
                      className="input input-bordered w-full"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">New Password</span>
                    </label>
                    <input
                      type="password"
                      className="input input-bordered w-full"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Confirm Password</span>
                    </label>
                    <input
                      type="password"
                      className="input input-bordered w-full"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                {passwordError && (
                  <div className="alert alert-error mt-4">
                    <span>{passwordError}</span>
                  </div>
                )}
                {passwordSuccess && (
                  <div className="alert alert-success mt-4">
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                <div className="card-actions mt-4">
                  <button className="btn btn-primary gap-2" onClick={changePassword}>
                    Update Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
