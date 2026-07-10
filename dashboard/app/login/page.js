'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Request failed');
      }
      setResetSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (forgotMode) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-8">
        <Image src="/logo.png" alt="Clean Energy Local Currency Fund" width={220} height={50} priority />

        <form onSubmit={handleForgotPassword} className="w-full max-w-sm bg-white p-8 rounded-lg shadow space-y-4 border-t-4 border-brand-blue">
          <h1 className="text-xl font-semibold text-center text-brand-navy">Reset Password</h1>

          {resetSent ? (
            <p className="text-sm text-gray-600">
              If an account exists for <strong>{email}</strong>, a password reset link has been sent. Check your inbox.
            </p>
          ) : (
            <>
              <div>
                <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-navy hover:bg-brand-blue transition-colors text-white rounded py-2 font-medium disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => { setForgotMode(false); setResetSent(false); setError(null); }}
            className="w-full text-sm text-gray-500 hover:text-brand-blue"
          >
            ← Back to sign in
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-8">
      <Image src="/logo.png" alt="Clean Energy Local Currency Fund" width={220} height={50} priority />

      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-8 rounded-lg shadow space-y-4 border-t-4 border-brand-blue">
        <h1 className="text-xl font-semibold text-center text-brand-navy">CEF-PIP Sign In</h1>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-navy hover:bg-brand-blue transition-colors text-white rounded py-2 font-medium disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <button
          type="button"
          onClick={() => { setForgotMode(true); setError(null); }}
          className="w-full text-sm text-gray-500 hover:text-brand-blue"
        >
          Forgot password?
        </button>
      </form>
    </main>
  );
}
