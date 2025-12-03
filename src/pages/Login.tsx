import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

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

      if (role === 'admin') nav('/dashboard', { replace: true });
      else nav('/requestpage', { replace: true });
    } catch (e: any) {
      setErr(e.message ?? 'Login failed');
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-3">
        <h1 className="text-2xl font-semibold">Login</h1>
        {err && <p className="text-red-600 text-sm">{err}</p>}

        {/* Role toggle */}
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            className={`flex-1 p-2 rounded ${roleType === 'student' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setRoleType('student')}
          >
            Student
          </button>
          <button
            type="button"
            className={`flex-1 p-2 rounded ${roleType === 'admin' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setRoleType('admin')}
          >
            Admin
          </button>
        </div>

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

        <button className="w-full p-2 rounded bg-black text-white">Sign In</button>

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
