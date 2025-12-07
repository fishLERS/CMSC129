import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [roleType, setRoleType] = useState<'student' | 'admin'>('student'); // toggle
  const nav = useNavigate();

  async function handleForgotPassword() {
    if (!email) {
      setErr('Please enter your email address first');
      return;
    }
    try {
      setErr(null);
      setSuccessMsg(null);
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg('Password reset email sent! Check your inbox.');
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        setErr('No account found with this email');
      } else if (e.code === 'auth/invalid-email') {
        setErr('Invalid email address');
      } else {
        setErr(e.message ?? 'Failed to send reset email');
      }
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setErr(null);
      setSuccessMsg(null);
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
    <div className="min-h-dvh grid place-items-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-3">
        <h1 className="text-2xl font-semibold">Login</h1>
        {err && <p className="text-red-600 text-sm">{err}</p>}
        {successMsg && <p className="text-green-600 text-sm">{successMsg}</p>}

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

        <div className="flex justify-between items-center mt-2">
          {roleType === 'student' ? (
            <p className="text-sm">
              No account? <Link className="underline" to="/signup">Sign Up</Link>
            </p>
          ) : (
            <p className="text-sm">
              No account? <Link className="underline" to="/signup?role=admin">Sign Up</Link>
            </p>
          )}
          <button
            type="button"
            className="text-sm text-blue-600 hover:underline"
            onClick={handleForgotPassword}
          >
            Forgot Password?
          </button>
        </div>
      </form>
    </div>
  );
}
