'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/apiClient';
import { USER_ROLES, USER_ROLE_LABELS } from '../../../../lib/constants';
import { usePaginatedList } from '../../../../lib/usePaginatedList';
import Pagination from '../../Pagination';
import SortHeader from '../../SortHeader';

function searchUser(u, term) {
  return (
    u.email.toLowerCase().includes(term) ||
    (u.assetco_id || '').toLowerCase().includes(term) ||
    (u.assetco_ids || []).some((id) => id.toLowerCase().includes(term))
  );
}

const inputCls = 'w-full border border-gray-300 rounded px-2 py-1.5 text-sm';

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function UserManagementPanel({ assetcos }) {
  const [users, setUsers] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState({ email: '', role: 'ops', assetcoId: assetcos[0]?.id || '', assetcoIds: [] });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);
  const [resetResult, setResetResult] = useState(null);
  const [resettingId, setResettingId] = useState(null);
  const [roleFilter, setRoleFilter] = useState('');

  const preFiltered = roleFilter ? (users || []).filter((u) => u.role === roleFilter) : users || [];
  const { search, setSearch, page, setPage, totalPages, totalCount, paginated, sortKey, sortDir, toggleSort } = usePaginatedList(preFiltered, {
    searchFn: searchUser,
    pageSize: 10,
  });

  async function loadUsers() {
    try {
      const data = await apiFetch('/api/users');
      setUsers(data.users);
    } catch (err) {
      setLoadError(err.message);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate() {
    setSubmitting(true);
    setError(null);
    setCreated(null);
    try {
      const data = await apiFetch('/api/users', {
        method: 'POST',
        body: {
          email: form.email,
          role: form.role,
          assetcoId: form.role === 'assetco_admin' ? form.assetcoId : undefined,
          assetcoIds: form.role === 'assetco_dev' ? form.assetcoIds : undefined,
        },
      });
      setCreated(data);
      setForm({ email: '', role: 'ops', assetcoId: assetcos[0]?.id || '', assetcoIds: [] });
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(user) {
    setResettingId(user.id);
    setError(null);
    setResetResult(null);
    try {
      const data = await apiFetch(`/api/users/${user.id}/reset-password`, { method: 'POST' });
      setResetResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setResettingId(null);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <h2 className="font-semibold text-sm">Create Account</h2>
        <Field label="Email">
          <input
            type="email"
            className={inputCls}
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </Field>
        <Field label="Role">
          <select
            className={inputCls}
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          >
            {USER_ROLES.map((r) => (
              <option key={r} value={r}>{USER_ROLE_LABELS[r]}</option>
            ))}
          </select>
        </Field>
        {form.role === 'assetco_admin' && (
          <Field label="AssetCo">
            <select
              className={inputCls}
              value={form.assetcoId}
              onChange={(e) => setForm((f) => ({ ...f, assetcoId: e.target.value }))}
            >
              {assetcos.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </Field>
        )}
        {form.role === 'assetco_dev' && (
          <Field label="AssetCos (this login can switch between them)">
            <div className="space-y-1 border border-gray-300 rounded p-2 max-h-40 overflow-y-auto">
              {assetcos.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.assetcoIds.includes(a.id)}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        assetcoIds: e.target.checked
                          ? [...f.assetcoIds, a.id]
                          : f.assetcoIds.filter((id) => id !== a.id),
                      }))
                    }
                  />
                  {a.name}
                </label>
              ))}
            </div>
          </Field>
        )}
        <button
          disabled={submitting || !form.email || (form.role === 'assetco_dev' && form.assetcoIds.length === 0)}
          onClick={handleCreate}
          className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50 hover:bg-brand-blue transition-all active:scale-95"
        >
          {submitting ? 'Creating…' : 'Create Account'}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {created && (
          <div className="text-sm bg-green-50 border border-green-200 rounded p-2 text-green-800">
            <p>Account created for <strong>{created.user.email}</strong>.</p>
            <p className="mt-1">
              Temporary password: <code className="bg-white px-1 py-0.5 rounded border">{created.tempPassword}</code>
            </p>
            <p className="mt-1 text-xs text-green-700">
              Share this with the user securely. It is shown only once. They should change it on first login.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {resetResult && (
          <div className="text-sm bg-green-50 border border-green-200 rounded p-2 text-green-800">
            <p>Password reset for <strong>{resetResult.user.email}</strong>.</p>
            <p className="mt-1">
              New temporary password: <code className="bg-white px-1 py-0.5 rounded border">{resetResult.tempPassword}</code>
            </p>
            <p className="mt-1 text-xs text-green-700">
              Share this with the user securely. It is shown only once. They should change it on first login.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            type="text"
            placeholder="Search email or AssetCo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:max-w-xs border border-gray-300 rounded px-3 py-1.5 text-sm"
          />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
            <option value="">All roles</option>
            {USER_ROLES.map((r) => <option key={r} value={r}>{USER_ROLE_LABELS[r]}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr>
                <th className="p-3"><SortHeader label="Email" sortKey="email" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} /></th>
                <th className="p-3"><SortHeader label="Role" sortKey="role" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} /></th>
                <th className="p-3">AssetCo</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginated.map((u) => (
                <tr key={u.id}>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{USER_ROLE_LABELS[u.role] || u.role}</td>
                  <td className="p-3">
                    {u.role === 'assetco_dev'
                      ? (u.assetco_ids || []).join(', ') || 'N/A'
                      : u.assetco_id || 'N/A'}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      disabled={resettingId === u.id}
                      onClick={() => handleResetPassword(u)}
                      className="text-xs text-brand-blue hover:underline disabled:opacity-50"
                    >
                      {resettingId === u.id ? 'Resetting…' : 'Reset Password'}
                    </button>
                  </td>
                </tr>
              ))}
              {users && paginated.length === 0 && (
                <tr><td className="p-3 text-gray-500" colSpan={4}>No users match your search.</td></tr>
              )}
              {loadError && (
                <tr><td className="p-3 text-red-600" colSpan={4}>{loadError}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {users && <Pagination page={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} itemLabel="users" />}
      </div>
    </div>
  );
}
