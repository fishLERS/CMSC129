import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

export default function LoginForm({ role }: { role?: 'student' | 'admin' }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();
  const loc = useLocation() as any;
  const redirectTo = loc.state?.from?.pathname ?? (role === 'admin' ? '/admin' : '/dashboard');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setErr(null);
      await signInWithEmailAndPassword(auth, email, pass);
      nav(redirectTo, { replace: true });
    } catch (e: any) {
      setErr(e.message ?? 'login failed');
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-3">
        <h1 className="text-2xl font-semibold">{role === 'admin' ? 'admin login' : 'student login'}</h1>
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <input
          className="w-full p-2 border rounded"
          placeholder="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full p-2 border rounded"
          placeholder="password"
          type="password"
          value={pass}
          onChange={e => setPass(e.target.value)}
          required
        />
        <button className="w-full p-2 rounded bg-black text-white">sign in</button>
        {role !== 'admin' && (
          <p className="text-sm">
            no account? <Link className="underline" to="/signup">sign up</Link>
          </p>
        )}
      </form>
    </div>
  );
}
