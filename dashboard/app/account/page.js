'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '../../lib/supabaseClient';
import { apiFetch } from '../../lib/apiClient';

// Deliberately outside /dashboard and /engagement — this page has to be
// reachable by every role, including ic_secretariat/board_member, which
// middleware confines away from /dashboard entirely. See middleware.js for
// the matching "logged in, no role restriction" entry.
export default function AccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data?.user?.email || null));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      });
      setDone(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-6 px-4">
      <div className="w-full max-w-sm">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-blue mb-4"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div className="bg-white p-8 rounded-lg shadow space-y-4 border-t-4 border-brand-blue">
          <div>
            <h1 className="text-xl font-semibold text-brand-navy">Change Password</h1>
            {email && <p className="text-sm text-gray-500 mt-1">{email}</p>}
          </div>

          {done ? (
            <p className="text-sm text-green-700">Your password has been changed.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="current-password" className="block text-sm font-medium text-gray-700">Current password</label>
                <input
                  id="current-password"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">New password</label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
              <div>
                <label htmlFor="confirm-new-password" className="block text-sm font-medium text-gray-700">Confirm new password</label>
                <input
                  id="confirm-new-password"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-navy hover:bg-brand-blue transition-colors text-white rounded py-2 font-medium disabled:opacity-50"
              >
                {loading ? 'Changing…' : 'Change Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
