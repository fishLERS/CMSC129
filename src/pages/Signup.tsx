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
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedRole = searchParams.get('role') === 'admin' ? 'admin' : 'student';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setErr(null);

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
    <div className="min-h-dvh grid place-items-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-3">
        <h1 className="text-2xl font-semibold">Sign Up</h1>
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <input
          className="w-full p-2 border rounded"
          placeholder="Full Name (optional)"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          className="w-full p-2 border rounded"
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full p-2 border rounded"
          placeholder="Password"
          type="password"
          value={pass}
          onChange={e => setPass(e.target.value)}
          required
        />
        <input
          className="w-full p-2 border rounded"
          placeholder="Confirm Password"
          type="password"
          value={pass2}
          onChange={e => setPass2(e.target.value)}
          required
        />
        <button className="w-full p-2 rounded bg-black text-white">Create Account</button>
        <p className="text-sm">
          Have an account? <Link className="underline" to="/login">Log In</Link>
        </p>
      </form>
    </div>
  );
}
