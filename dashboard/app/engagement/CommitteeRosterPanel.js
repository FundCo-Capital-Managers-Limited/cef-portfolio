'use client';

import { useEffect, useState } from 'react';
import { Crown, PenSquare, X } from 'lucide-react';
import { apiFetch } from '../../lib/apiClient';

// Roster edits are gated server-side too (management/executive/it_admin, or
// the active Secretary) - buttons here just avoid showing controls that
// would 403, they aren't the real enforcement. autoManage covers the fixed
// roles; secretary status is dynamic (lives on a roster row, not a user
// role), so it's derived from the members list itself once loaded rather
// than needing a separate "am I allowed" endpoint.
export default function CommitteeRosterPanel({ currentUserId, autoManage }) {
  const [members, setMembers] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const canManageRoster = autoManage || (members || []).some((m) => m.user_id === currentUserId && m.is_secretary);

  async function load() {
    try {
      const membersData = await apiFetch('/api/ic/committee');
      setMembers(membersData.members);
      const isSecretary = membersData.members.some((m) => m.user_id === currentUserId && m.is_secretary);
      if (autoManage || isSecretary) {
        const candidatesData = await apiFetch('/api/ic/committee/candidates');
        setCandidates(candidatesData.users);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const memberUserIds = new Set((members || []).map((m) => m.user_id));
  const availableCandidates = candidates.filter((c) => !memberUserIds.has(c.id));

  async function handleAdd() {
    if (!selectedUserId) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/ic/committee', { method: 'POST', body: { userId: selectedUserId } });
      setSelectedUserId('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(memberId) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/ic/committee/${memberId}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleFlag(memberId, field, current) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/ic/committee/${memberId}`, { method: 'PATCH', body: { [field]: !current } });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
      <h2 className="text-sm font-semibold">Committee Roster</h2>

      {members && members.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No committee members yet.</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {(members || []).map((m) => (
          <div key={m.id} className="py-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm">
                {m.user?.name || m.user?.email || m.user_id}
                {m.is_chair && <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">Chair</span>}
                {m.is_secretary && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Secretary</span>}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{m.user?.role?.replace(/_/g, ' ')}</p>
            </div>
            {canManageRoster && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  disabled={busy}
                  onClick={() => handleToggleFlag(m.id, 'is_chair', m.is_chair)}
                  title={m.is_chair ? 'Remove as Chair' : 'Make Chair'}
                  className="text-gray-400 hover:text-purple-600 disabled:opacity-50"
                >
                  <Crown size={15} />
                </button>
                <button
                  disabled={busy}
                  onClick={() => handleToggleFlag(m.id, 'is_secretary', m.is_secretary)}
                  title={m.is_secretary ? 'Remove as Secretary' : 'Make Secretary'}
                  className="text-gray-400 hover:text-blue-600 disabled:opacity-50"
                >
                  <PenSquare size={15} />
                </button>
                <button
                  disabled={busy}
                  onClick={() => handleRemove(m.id)}
                  title="Remove from roster"
                  className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                >
                  <X size={15} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {canManageRoster && (
        <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <select
            className="flex-1 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded px-2 py-1.5 text-sm"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">Add a member…</option>
            {availableCandidates.map((c) => (
              <option key={c.id} value={c.id}>{c.name || c.email}</option>
            ))}
          </select>
          <button
            disabled={busy || !selectedUserId}
            onClick={handleAdd}
            className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50 hover:bg-brand-blue transition-all active:scale-95"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
