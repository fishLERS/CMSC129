import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        <div className="relative">
          <input
            className="w-full p-2 border rounded pr-10"
            placeholder="Password"
            type={showPassword ? 'text' : 'password'}
            value={pass}
            onChange={e => setPass(e.target.value)}
            required
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
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
