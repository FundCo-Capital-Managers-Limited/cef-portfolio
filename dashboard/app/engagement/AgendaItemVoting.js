'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiClient';

const OUTCOMES = [
  'APPROVED', 'APPROVED_WITH_CONDITIONS', 'APPROVED_WITHIN_REVISED_PARAMETERS',
  'APPROVED_UNDER_DELEGATED_AUTHORITY', 'DEFERRED', 'RETURNED', 'DECLINED',
  'NOTED', 'RATIFIED', 'WITHDRAWN',
];

// Sits under an agenda item, expanded on demand — the vote-summary/conflict/
// decision surface for that one matter within this one meeting. canDecide is
// computed by the parent from the meeting's own chair_user_id/secretary_id
// (a per-meeting responsibility) plus the auto IC-management roles.
export default function AgendaItemVoting({ meetingId, matterId, currentUserId, canDecide }) {
  const [summary, setSummary] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [conflictReason, setConflictReason] = useState('');
  const [outcome, setOutcome] = useState('APPROVED');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const base = `/api/ic/meetings/${meetingId}/matters/${matterId}`;

  async function load() {
    try {
      const [summaryData, conflictsData] = await Promise.all([
        apiFetch(`${base}/vote-summary`),
        apiFetch(`${base}/conflicts`),
      ]);
      setSummary(summaryData.summary);
      setConflicts(conflictsData.conflicts);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRecused = conflicts.some((c) => c.user_id === currentUserId);
  const myVote = summary?.votes.find((v) => v.user_id === currentUserId);
  const decided = Boolean(summary?.decision);

  async function handleVote(value) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`${base}/vote`, { method: 'POST', body: { value } });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeclareConflict() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`${base}/conflicts`, { method: 'POST', body: { reason: conflictReason || undefined } });
      setConflictReason('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRecordDecision() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`${base}/decision`, { method: 'POST', body: { outcome } });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!summary) return <p className="text-xs text-gray-400 py-2">Loading vote status…</p>;

  return (
    <div className="bg-gray-50 dark:bg-gray-950 rounded p-3 text-xs space-y-2">
      <p className="text-gray-600 dark:text-gray-400">
        {summary.votesFor} for · {summary.votesAgainst} against · {summary.votesAbstain} abstain
        {' · '}
        {summary.eligibleVoterCount} eligible of {summary.activeMemberCount} member{summary.activeMemberCount === 1 ? '' : 's'}
        {summary.recusedCount > 0 && ` (${summary.recusedCount} recused)`}
        {' · quorum '}
        <span className={summary.quorumMet ? 'text-green-700 dark:text-green-500' : 'text-amber-700 dark:text-amber-500'}>
          {summary.quorumMet ? 'met' : `not met (needs ${summary.quorumRequired})`}
        </span>
      </p>

      {error && <p className="text-red-600">{error}</p>}

      {decided && (
        <p className="text-green-700 dark:text-green-500 font-medium">
          Decision recorded: {summary.decision.outcome.replace(/_/g, ' ')} ({summary.decision.votes_for} for / {summary.decision.votes_against} against / {summary.decision.votes_abstain} abstain, quorum {summary.decision.quorum_met ? 'met' : 'not met'})
        </p>
      )}

      {!decided && (
        <>
          {isRecused ? (
            <p className="text-gray-500 dark:text-gray-400">You've declared a conflict on this matter and cannot vote.</p>
          ) : (
            <div className="flex items-center gap-2">
              {['APPROVE', 'REJECT', 'ABSTAIN'].map((v) => (
                <button
                  key={v}
                  disabled={busy}
                  onClick={() => handleVote(v)}
                  className={`px-2 py-1 rounded border disabled:opacity-50 ${
                    myVote?.value === v
                      ? 'bg-brand-navy text-white border-brand-navy'
                      : 'border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {v}
                </button>
              ))}
              <div className="flex items-center gap-1 ml-2">
                <input
                  type="text"
                  placeholder="Conflict reason (optional)"
                  className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded px-1.5 py-1 text-xs"
                  value={conflictReason}
                  onChange={(e) => setConflictReason(e.target.value)}
                />
                <button
                  disabled={busy}
                  onClick={handleDeclareConflict}
                  className="border border-gray-300 dark:border-gray-700 rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                >
                  Declare Conflict
                </button>
              </div>
            </div>
          )}

          {canDecide && (
            <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
              <select
                className="border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded px-1.5 py-1"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
              >
                {OUTCOMES.map((o) => (
                  <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <button
                disabled={busy}
                onClick={handleRecordDecision}
                className="bg-brand-navy text-white rounded px-2 py-1 hover:bg-brand-blue disabled:opacity-50"
              >
                Record Decision
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
