import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import '/src/index.css'

export default function Login() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [roleType, setRoleType] = useState<'student' | 'admin'>('student'); // toggle
  const nav = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setErr(null);
      const cred = await signInWithEmailAndPassword(auth, email, pass);

      const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
      const role = userDoc.data()?.role || null;

      if (!role) throw new Error('User role not found');

      if (role !== roleType)
        throw new Error(`You are not registered as ${roleType}`);

      localStorage.setItem('userRole', role);

  if (role === 'admin') nav('/admindashboard', { replace: true });
  else nav('/student', { replace: true });
    } catch (e: any) {
      setErr(e.message ?? 'Login failed');
    }
  }

  return (
    <div className="relative min-h-screen grid place-items-center overflow-hidden">
      <svg
        className="absolute"
        viewBox="0 0 1440 705"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="#74AAF0"
          fillOpacity="1"
          d="M 0 0 L 0 106 C 48 112 54 96 116 146 C 185 207 241 112 339 181 C 497 294 631 229 727 198 C 788 145 821 79 822 0 00Z"
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
          d="M 139 1 C 145 53 225 139 316 150 C 472 158 407 218 531 246 C 748 292 667 330 904 508 C 1053 630 1163 719 1440 720 L 1440 0 00Z"
        ></path>
      </svg>

      <div className='absolute left-25 text-main-1 text-9xl font-extrabold'>
        <p>FishLERS</p>
      </div>
      <div className='absolute left-26 bottom-63 text-main-1 text-xl'>
        <p>Fisheries Laboratory Equipment Reservation System</p>
      </div>

      <form onSubmit={onSubmit} className="absolute right-30 w-full max-w-sm space-y-3 p-8 rounded-3xl">
        {err && <p className="text-red-600 text-sm">{err}</p>}

        {roleType && (
            <p className="mt-2 text-white">
              {roleType === 'student' 
                ? "You are logging in as a student." 
                : "You are logging in as an admin."}
            </p>
        )}

        {/* Role toggle */}
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            className={`flex-1 p-2  ${roleType === 'student' ? 'bg-main-1 text-white font-bold' : 'bg-main-4'  }`}
            onClick={() => setRoleType('student')}
          >
            Student
          </button>
          <button
            type="button"
            className={`flex-1 p-2 ${roleType === 'admin' ? 'bg-main-1 text-white font-bold' : 'bg-main-4'}`}
            onClick={() => setRoleType('admin')}
          >
            Admin
          </button>
        </div>
        

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

        <button className="w-full p-2 bg-main-1 text-white font-bold hover:bg-main-4">Sign In</button>

        {/* Show signup for students and an admin signup request link for admins */}
        {roleType === 'student' ? (
          <p className="text-sm mt-2">
            No account? <Link className="underline" to="/signup">Sign Up</Link>
          </p>
        ) : (
          <p className="text-sm mt-2">
            Need an admin account? <Link className="underline" to="/signup?role=admin">Create admin account</Link>
          </p>
        )}
      </form>
    </div>
  );
}
