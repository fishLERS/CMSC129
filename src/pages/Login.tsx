// src/pages/Login.tsx
import React from 'react';
import { Link } from 'react-router-dom';

// Login landing page: choose student or admin login
export default function Login() {
  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-2xl font-semibold">choose login</h1>
        <p className="text-sm">Please choose whether you are a student or an admin.</p>
        <div className="grid gap-3">
          <Link to="/login/student" className="p-3 rounded bg-black text-white">Student login</Link>
          <Link to="/login/admin" className="p-3 rounded border text-center">Admin login</Link>
        </div>
        <p className="text-sm">or <Link to="/signup" className="underline">create an account</Link></p>
      </div>
    </div>
  );
}
