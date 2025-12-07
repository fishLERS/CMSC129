import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft } from 'lucide-react';

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
    <div className="min-h-dvh grid place-items-center p-6 bg-gradient-to-b from-base-200 via-base-200 to-cyan-950/30 relative overflow-hidden">
      {/* Ocean/Fisheries themed background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Water wave gradients */}
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl"></div>
        
        {/* Bubble elements */}
        <div className="absolute top-[15%] left-[10%] w-4 h-4 bg-cyan-400/20 rounded-full animate-pulse"></div>
        <div className="absolute top-[25%] left-[20%] w-2 h-2 bg-cyan-300/30 rounded-full"></div>
        <div className="absolute top-[40%] left-[8%] w-3 h-3 bg-blue-400/20 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute top-[60%] left-[15%] w-2 h-2 bg-teal-400/25 rounded-full"></div>
        <div className="absolute top-[75%] left-[12%] w-5 h-5 bg-cyan-500/15 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        
        <div className="absolute top-[20%] right-[15%] w-3 h-3 bg-blue-400/20 rounded-full animate-pulse" style={{animationDelay: '0.3s'}}></div>
        <div className="absolute top-[35%] right-[10%] w-2 h-2 bg-cyan-400/25 rounded-full"></div>
        <div className="absolute top-[50%] right-[20%] w-4 h-4 bg-teal-400/15 rounded-full animate-pulse" style={{animationDelay: '0.7s'}}></div>
        <div className="absolute top-[70%] right-[8%] w-2 h-2 bg-blue-300/30 rounded-full"></div>
        <div className="absolute top-[85%] right-[18%] w-3 h-3 bg-cyan-400/20 rounded-full animate-pulse" style={{animationDelay: '1.2s'}}></div>

        {/* Fish silhouettes */}
        <svg className="absolute top-[20%] left-[5%] w-12 h-8 text-cyan-500/10 rotate-12" viewBox="0 0 24 16" fill="currentColor">
          <path d="M17 8c3-2 5-2 7 0-2 2-4 2-7 0zm-2 0c-3 4-8 6-12 4 0-2 1-4 3-4-2 0-3-2-3-4 4-2 9 0 12 4z"/>
        </svg>
        <svg className="absolute top-[45%] right-[7%] w-16 h-10 text-blue-500/8 -rotate-6" viewBox="0 0 24 16" fill="currentColor">
          <path d="M17 8c3-2 5-2 7 0-2 2-4 2-7 0zm-2 0c-3 4-8 6-12 4 0-2 1-4 3-4-2 0-3-2-3-4 4-2 9 0 12 4z"/>
        </svg>
        <svg className="absolute bottom-[25%] left-[8%] w-10 h-6 text-teal-500/10 rotate-[-20deg]" viewBox="0 0 24 16" fill="currentColor">
          <path d="M17 8c3-2 5-2 7 0-2 2-4 2-7 0zm-2 0c-3 4-8 6-12 4 0-2 1-4 3-4-2 0-3-2-3-4 4-2 9 0 12 4z"/>
        </svg>
        <svg className="absolute bottom-[40%] right-[12%] w-8 h-5 text-cyan-600/8 rotate-6" viewBox="0 0 24 16" fill="currentColor">
          <path d="M17 8c3-2 5-2 7 0-2 2-4 2-7 0zm-2 0c-3 4-8 6-12 4 0-2 1-4 3-4-2 0-3-2-3-4 4-2 9 0 12 4z"/>
        </svg>

        {/* Wave patterns - layered at bottom */}
        <div className="absolute bottom-0 left-0 w-full h-48 overflow-hidden">
          {/* Back wave - slowest */}
          <svg className="absolute bottom-0 left-0 w-[200%] h-full text-cyan-500/40 animate-[wave_20s_ease-in-out_infinite]" viewBox="0 0 2880 120" preserveAspectRatio="none">
            <path fill="currentColor" d="M0,40 C240,100 480,0 720,50 C960,100 1200,10 1440,40 C1680,100 1920,0 2160,50 C2400,100 2640,10 2880,40 L2880,120 L0,120 Z"></path>
          </svg>
          
          {/* Middle wave - medium speed */}
          <svg className="absolute bottom-0 left-0 w-[200%] h-36 text-cyan-600/50 animate-[wave_15s_ease-in-out_infinite_reverse]" viewBox="0 0 2880 120" preserveAspectRatio="none">
            <path fill="currentColor" d="M0,60 C360,10 720,90 1080,30 C1440,60 1800,10 2160,90 C2520,30 2700,50 2880,60 L2880,120 L0,120 Z"></path>
          </svg>
          
          {/* Front wave - fastest */}
          <svg className="absolute bottom-0 left-0 w-[200%] h-28 text-cyan-700/60 animate-[wave_10s_ease-in-out_infinite]" viewBox="0 0 2880 120" preserveAspectRatio="none">
            <path fill="currentColor" d="M0,70 C180,30 360,90 540,50 C720,10 900,70 1080,40 C1260,10 1440,70 1620,30 C1800,90 1980,50 2160,10 C2340,70 2520,40 2700,10 C2800,50 2850,70 2880,70 L2880,120 L0,120 Z"></path>
          </svg>
        </div>
      </div>

      {/* Back to Landing Page button */}
      <Link 
        to="/" 
        className="absolute top-6 left-6 z-20 btn btn-ghost btn-sm gap-2 text-base-content/70 hover:text-base-content"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <form onSubmit={onSubmit} className="w-full max-w-sm relative z-10">
        <fieldset className="fieldset bg-base-100/90 backdrop-blur-sm border-cyan-800/20 rounded-box border p-6 shadow-xl shadow-cyan-900/10">
          <legend className="fieldset-legend text-xl font-semibold px-2 flex items-center gap-2">
            🐟 FishLERS Login
          </legend>

          {err && <p className="text-error text-sm mb-3">{err}</p>}
          {successMsg && <p className="text-success text-sm mb-3">{successMsg}</p>}

          {/* Role toggle */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              className={`btn flex-1 ${roleType === 'student' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setRoleType('student')}
            >
              Student
            </button>
            <button
              type="button"
              className={`btn flex-1 ${roleType === 'admin' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setRoleType('admin')}
            >
              Admin
            </button>
          </div>

          {/* Email field */}
          <label className="fieldset-label">Email</label>
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
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-base-content/60 hover:text-base-content cursor-pointer"
              onMouseDown={e => e.preventDefault()}
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

          {/* Submit button */}
          <button className="btn btn-primary w-full mt-6">Sign In</button>

          {/* Footer links */}
          <div className="flex justify-between items-center mt-4 text-sm">
            {roleType === 'student' ? (
              <p>
                No account? <Link className="link link-primary" to="/signup">Sign Up</Link>
              </p>
            ) : (
              <p>
                No account? <Link className="link link-primary" to="/signup?role=admin">Sign Up</Link>
              </p>
            )}
            <button
              type="button"
              className="link link-primary"
              onClick={handleForgotPassword}
            >
              Forgot Password?
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
