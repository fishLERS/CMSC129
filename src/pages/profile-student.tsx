import React from 'react'
import { useAuth } from '../hooks/useAuth'
import { db } from '../firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { auth } from '../firebase'
import Sidebar from '../sidebar'
import '/src/index.css'

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

export default function ProfileStudent() {
  const { user } = useAuth()
  const [loading, setLoading] = React.useState(true)
  const [profile, setProfile] = React.useState<any>(null)
  const [editing, setEditing] = React.useState(false)
  const [displayName, setDisplayName] = React.useState('')
  const [studentNumber, setStudentNumber] = React.useState('')
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
          setStudentNumber(data?.studentNumber || '')
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
      // validate student number format if provided
      const sn = (studentNumber || '').trim()
      if (sn && !/^20\d{2}-\d{5}$/.test(sn)) {
        alert('Student number must be in the format 20XX-XXXXX')
        setEditing(true)
        return
      }
      // update firestore users doc
      const ref = doc(db, 'users', user.uid)
  const updates: any = { displayName, studentNumber: sn }
  await updateDoc(ref, updates)
  setProfile((p:any) => ({ ...(p||{}), displayName, studentNumber: sn }))
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
    <div className='relative overflow-hidden'>
      <svg
        className="absolute"
        viewBox="0 0 1440 705"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="#74AAF0"
          fillOpacity="1"
          d="M 0 0 L 0 294 C 16 417 42 258 143 381 C 176 427 249 288 319 324 C 380 355 430 441 610 460 C 840 475 926 428 1036 437 C 1130 444 1211 503 1259 448 C 1309 395 1316 525 1440 411 L 1440 0 00Z"
        ></path>
      </svg> 
      <svg
        className="absolute"
        viewBox="0 0 1440 705"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="#5091E5"
          fillOpacity="1"
          d="M 0 0 L 0 106 C 14 174 62 154 102 196 C 146 233 212 256 287 273 C 383 290 672 292 762 249 C 843 204 989 143 1053 206 C 1114 269 1336 360 1440 324 L 1440 0 00Z"
        ></path>
      </svg> 
      <Sidebar />
      <div style={{ marginLeft: 'var(--sidebar-width)' }} className="relative min-h-screen text-black p-4 z-90">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="max-w-6xl mx-auto">
              <div className="px-6 py-1 pb-10 bg-gradient-to-b from-main-4 via-main-4 to-main-5 rounded-xl opacity-80">
                <h1 className="text-2xl font-bold my-8">My Profile</h1>
                  <div className="flex flex-col md:flex-row items-start gap-6">
                    <div className="flex-shrink-0">
                      <img
                        src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName||user?.email||'User')}&background=ffffff&color=111827&bold=true`}
                        alt="avatar"
                        className="w-28 h-28 rounded-full border-4 border-dark shadow"
                      />
                    </div>

                    <div className="flex-1 w-full">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-xs">Full Name</label>
                          <input
                            id="displayName"
                            className={`w-full rounded-lg bg-white shadow-lg p-3 text-sm ${editing ? 'focus:ring-main-1' : 'focus:ring-0 focus:outline-none'}`}
                            placeholder="Your Full Name"
                            value={editing ? displayName : (profile?.displayName || user.displayName || '')}
                            onChange={(e) => setDisplayName(e.target.value)}
                            readOnly={!editing}
                            tabIndex={editing ? 0 : -1}
                          />
                        </div>

                        <div>
                          <label className="text-xs">Student Number</label>
                          <input
                            className={`w-full rounded-lg bg-white shadow-lg p-3 text-sm ${editing ? 'focus:ring-main-1' : 'focus:ring-0 focus:outline-none'}`}
                            placeholder="20XX-XXXXX"
                            value={editing ? studentNumber : (profile?.studentNumber || '')}
                            onChange={(e) => setStudentNumber(e.target.value)}
                            readOnly={!editing}
                            tabIndex={editing ? 0 : -1}
                          />
                        </div>

                        <div>
                          <label className="text-xs">Email</label>
                          <input
                            className={`w-full rounded-lg bg-white shadow-lg p-3 text-sm ${editing ? 'bg-base-300 opacity-80' : 'bg-base-200'} focus:ring-0 focus:outline-none`}
                            value={profile?.email || user.email}
                            readOnly
                            tabIndex={-1}
                          />
                        </div>

                        <div>
                          <label className="text-xs">Role</label>
                          <input
                            className={`w-full rounded-lg bg-white shadow-lg p-3 text-sm ${editing ? 'bg-base-300 opacity-80' : 'bg-base-200'} focus:ring-0 focus:outline-none`}
                            value={profile?.role || 'student'}
                            readOnly
                            tabIndex={-1}
                          />
                        </div>

                        <div>
                          <label className="text-xs">User ID</label>
                          <input
                            className={`w-full rounded-lg bg-white shadow-lg p-3 text-sm ${editing ? 'bg-base-300 opacity-80' : 'bg-base-200'} focus:ring-0 focus:outline-none`}
                            value={profile?.uid || user.uid}
                            readOnly
                            tabIndex={-1}
                          />
                        </div>
                      </div>
                      {!editing ? (
                          <button className="btn border-0 rounded-xl bg-main-1 mt-3 hover:bg-main-2" onClick={() => setEditing(true)}>Edit Profile</button>
                        ) : (
                          <div className="flex gap-2">
                            <button className="btn bg-main-1 border-0 rounded-xl mt-3 hover:bg-main-2" onClick={save}>Save</button>
                            <button className="btn bg-dark border-0 rounded-xl mt-3 hover:bg-dark-hover" onClick={() => { setEditing(false); setDisplayName(profile?.displayName || user.displayName || ''); setStudentNumber(profile?.studentNumber || '') }}>Cancel</button>
                          </div>
                        )}

                      {/* Change Password Section */}
                      <div className="mt-8">
                        <h3 className="text-sm font-semibold">Change Password</h3>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs">Current Password</label>
                            <input
                              type="password"
                              className="w-full rounded-lg bg-white shadow-lg p-3 text-sm focus:ring-main-1"
                              placeholder="Current password"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-xs">New Password</label>
                            <input
                              type="password"
                              className="w-full rounded-lg bg-white shadow-lg p-3 text-sm focus:ring-main-1"
                              placeholder="New password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-xs">Confirm Password</label>
                            <input
                              type="password"
                              className="w-full rounded-lg bg-white shadow-lg p-3 text-sm focus:ring-main-1"
                              placeholder="Confirm password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                          </div>
                        </div>
                        {passwordError && <div className="mt-2 text-sm text-error">{passwordError}</div>}
                        {passwordSuccess && <div className="mt-2 text-sm text-success">{passwordSuccess}</div>}
                        <button className="btn rounded-xl bg-main-1 border-0 mt-4 hover:bg-main-2" onClick={changePassword}>Update Password</button>
                      </div>

                      {/* My Email Address Section
                      <div className="mt-8">
                        <h3 className="text-sm font-semibold">My Email Address</h3>
                        <div className="mt-4 bg-base-200 rounded-md p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-transparent flex items-center justify-center text-base-content/60">📧</div>
                            <div>
                              <div className="font-medium">{profile?.email || user.email}</div>
                              <div className="text-xs text-base-content/60">{formatDate(profile?.createdAt) || 'added recently'}</div>
                            </div>
                          </div>
                        </div>
                      </div> */}
                    </div>
                  </div>
                </div>
              </div>
        )}
      </div>
    </div>
  )
}
