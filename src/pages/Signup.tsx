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
    <div className="relative flex flex-col gap-10 min-h-dvh place-items-center justify-center overflow-hidden">
      <svg
        className="absolute"
        viewBox="0 0 1440 705"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="#74AAF0"
          fillOpacity="1"
          d="M 0 0 L -1 700 L 726 700 C 1051 696 1149 590 1210 571 C 1274 549 1307 502 1361 534 C 1383 549 1413 594 1440 548 L 1440 0 00Z"
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
          d="M 0 0 L -1 700 L 726 700 C 1010 641 916 599 1054 530 C 1129 486 1153 431 1220 423 C 1290 417 1403 446 1440 385 L 1440 0 00Z"
        ></path>
      </svg> 

      <div className='text-main-1 z-10'>
        <p className='text-center font-extrabold text-white text-5xl'>FishLERS</p>
        <p className='text-center text-white text-lg'>Fisheries Laboratory Equipment Reservation System</p>
      </div>
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-3 z-10">
        <h1 className="text-2xl font-semibold">Sign Up</h1>
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <input
          className="w-full p-2 bg-white text-black"
          placeholder="Full Name (optional)"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          className="w-full p-2 bg-white text-black"
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full p-2 bg-white text-black"
          placeholder="Password"
          type="password"
          value={pass}
          onChange={e => setPass(e.target.value)}
          required
        />
        <input
          className="w-full p-2 bg-white text-black"
          placeholder="Confirm Password"
          type="password"
          value={pass2}
          onChange={e => setPass2(e.target.value)}
          required
        />
        <button className="w-full p-2 bg-main-1 text-white font-bold hover:bg-main-4">Create Account</button>
        <p className="text-sm">
          Have an account? <Link className="underline" to="/login">Log In</Link>
        </p>
      </form>
    </div>
  );
}
