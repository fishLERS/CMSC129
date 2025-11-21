import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { auth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import './App.css';

export default function App() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('test@example.com');
  const [pass, setPass] = useState('supersecret');

  if (loading) return <p>loading…</p>;

  return (
    <div style={{ padding: 24 }}>
      <pre>user: {user?.uid ?? 'none'}</pre>
      {!user ? (
        <div style={{ display: 'grid', gap: 8, maxWidth: 320 }}>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email" />
          <input value={pass} onChange={e => setPass(e.target.value)} type="password" placeholder="password" />
          <button onClick={() => createUserWithEmailAndPassword(auth, email, pass)}>sign up</button>
          <button onClick={() => signInWithEmailAndPassword(auth, email, pass)}>sign in</button>
        </div>
      ) : (
        <button onClick={() => signOut(auth)}>sign out</button>
      )}
    </div>
  );
}
