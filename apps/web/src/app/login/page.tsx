'use client';

import React, { useState } from 'react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginErrors = { email?: string; password?: string };

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0]
      });
      return;
    }

    setErrors({});

    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      });

      if (res.ok) {
        window.location.href = '/';
      }
    } catch (err) {
      // Security: No client-side leakage of error metadata
      console.error('Authentication attempt failed.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base text-text-primary p-4">
      <div className="w-full max-w-md p-8 bg-bg-surface border border-brand/10 rounded-md shadow-xl">
        <h1 className="text-2xl font-bold text-brand mb-6 text-center">NextCaseHQ Access</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-bg-base border border-brand/20 rounded p-2 outline-none focus:border-brand"
              required
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-bg-base border border-brand/20 rounded p-2 outline-none focus:border-brand"
              required
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>
          <button
            type="submit"
            className="w-full h-12 bg-brand text-white font-bold rounded mt-4 hover:opacity-90 transition-opacity"
          >
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );
}
