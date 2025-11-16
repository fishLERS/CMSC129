// src/pages/Signup.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setErr(null);
      if (pass !== pass2) throw new Error('passwords do not match');
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (name) await updateProfile(cred.user, { displayName: name });
      nav('/', { replace: true });
    } catch (e: any) {
      setErr(e.message ?? 'signup failed');
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-3">
        <h1 className="text-2xl font-semibold">sign up</h1>
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <input
          className="w-full p-2 border rounded"
          placeholder="full name (optional)"
          value={name}
          onChange={e => setName(e.target.value)}
        />
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
        <input
          className="w-full p-2 border rounded"
          placeholder="confirm password"
          type="password"
          value={pass2}
          onChange={e => setPass2(e.target.value)}
          required
        />
        <button className="w-full p-2 rounded bg-black text-white">create account</button>
        <p className="text-sm">
          have an account? <Link className="underline" to="/login">log in</Link>
        </p>
      </form>
    </div>
  );
}
