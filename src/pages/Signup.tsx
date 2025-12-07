// src/pages/Signup.tsx
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedRole = searchParams.get('role') === 'admin' ? 'admin' : 'student';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setErr(null);

      if (!name.trim()) throw new Error('Full name is required');
      if (pass !== pass2) throw new Error('Passwords do not match');

      // Create Firebase Auth user
      const cred = await createUserWithEmailAndPassword(auth, email, pass);

      // Update display name
      if (name) await updateProfile(cred.user, { displayName: name });

      // Save user info in Firestore with the requested role (note: admin privileges
      // must still be granted server-side via custom claims; creating a Firestore
      // user with role:'admin' does NOT automatically grant admin auth claims)
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        displayName: name || '',
        email: email,
        role: requestedRole,
        requestedAdmin: requestedRole === 'admin' ? true : false,
        createdAt: new Date(),
      });

      // Store role in localStorage for quick access if needed
      localStorage.setItem('userRole', requestedRole);

      if (requestedRole === 'admin') {
        // Inform the user that admin accounts require approval/granting of custom claims
        // This must be performed by a project administrator using the server-side
        // script (scripts/set-claim.js) or the Firebase Console.
        alert('Admin account created. An administrator must approve and grant admin privileges before you can access admin pages.');
        nav('/login', { replace: true });
      } else {
        // Redirect student to student homepage
        nav('/student', { replace: true });
      }
    } catch (e: any) {
      setErr(e.message ?? 'Signup failed');
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center p-6 bg-base-200">
      <form onSubmit={onSubmit} className="w-full max-w-sm">
        <fieldset className="fieldset bg-base-100 border-base-300 rounded-box border p-6 shadow-lg">
          <legend className="fieldset-legend text-xl font-semibold px-2">
            Sign Up {requestedRole === 'admin' ? '(Admin)' : '(Student)'}
          </legend>

          {err && <p className="text-error text-sm mb-3">{err}</p>}

          {/* Full Name field */}
          <label className="fieldset-label">Full Name</label>
          <input
            className="input w-full"
            placeholder="Full Name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />

          {/* Email field */}
          <label className="fieldset-label mt-3">Email</label>
          <input
            className="input w-full"
            placeholder="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          {/* Password field */}
          <label className="fieldset-label mt-3">Password</label>
          <div className="relative">
            <input
              className="input w-full pr-10"
              placeholder="Password"
              type={showPassword ? 'text' : 'password'}
              value={pass}
              onChange={e => setPass(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/60 hover:text-base-content"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>

          {/* Confirm Password field */}
          <label className="fieldset-label mt-3">Confirm Password</label>
          <div className="relative">
            <input
              className="input w-full pr-10"
              placeholder="Confirm Password"
              type={showPassword2 ? 'text' : 'password'}
              value={pass2}
              onChange={e => setPass2(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/60 hover:text-base-content"
              onClick={() => setShowPassword2(!showPassword2)}
            >
              {showPassword2 ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>

          {/* Submit button */}
          <button className="btn btn-primary w-full mt-6">Create Account</button>

          {/* Footer link */}
          <p className="text-sm mt-4 text-center">
            Have an account? <Link className="link link-primary" to="/login">Log In</Link>
          </p>
        </fieldset>
      </form>
    </div>
  );
}
