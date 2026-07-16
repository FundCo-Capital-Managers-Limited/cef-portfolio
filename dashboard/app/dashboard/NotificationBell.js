'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabaseClient';
import { apiFetch } from '../../lib/apiClient';
import { timeAgo } from '../../lib/format';
import { notificationRoute } from '../../lib/entityRoutes';

const POLL_INTERVAL_MS = 30000;

function describe(entry) {
  const action = entry.action.replace(/_/g, ' ').toLowerCase();
  return `${entry.entity_type} ${entry.entity_id}: ${action}`;
}

export default function NotificationBell({ userId }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState([]);
  const [myUnreadCount, setMyUnreadCount] = useState(0);
  const [myItems, setMyItems] = useState([]);
  const cursorRef = useRef(null);

  useEffect(() => {
    if (!userId) return undefined;
    const supabase = createClient();
    let cancelled = false;

    async function ensureCursor() {
      const { data } = await supabase
        .from('notification_cursors')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (data) return data;

      const bootstrapped = { user_id: userId, last_seen_at: new Date().toISOString() };
      await supabase.from('notification_cursors').upsert(bootstrapped, { onConflict: 'user_id' });
      return bootstrapped;
    }

    async function refreshUnreadCount() {
      const cursor = cursorRef.current || (await ensureCursor());
      cursorRef.current = cursor;
      const { data } = await supabase
        .from('audit_log')
        .select('id')
        .gte('created_at', cursor.last_seen_at);
      if (!cancelled) setUnreadCount((data || []).length);
    }

    // Targeted notifications (flags, and later approvals) - own read state
    // per recipient, distinct from the audit_log cursor above.
    async function refreshMyUnreadCount() {
      try {
        const { unreadCount: count } = await apiFetch('/api/notifications/mine/unread-count');
        if (!cancelled) setMyUnreadCount(count);
      } catch {
        // Non-fatal - the bell still works for the audit_log feed if this fails.
      }
    }

    refreshUnreadCount();
    refreshMyUnreadCount();
    const interval = setInterval(() => {
      refreshUnreadCount();
      refreshMyUnreadCount();
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userId]);

  async function handleToggle() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen || !userId) return;

    const supabase = createClient();
    const { data } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setItems(data || []);

    const now = new Date().toISOString();
    await supabase.from('notification_cursors').upsert({ user_id: userId, last_seen_at: now }, { onConflict: 'user_id' });
    cursorRef.current = { user_id: userId, last_seen_at: now };
    setUnreadCount(0);

    try {
      const { items: mine } = await apiFetch('/api/notifications/mine');
      setMyItems(mine);
    } catch {
      // Leave whatever was last loaded rather than clearing it on a transient failure.
    }
  }

  async function handleMyNotificationClick(notification) {
    setOpen(false);
    try {
      await apiFetch(`/api/notifications/mine/${notification.id}/read`, { method: 'POST' });
      setMyUnreadCount((c) => Math.max(0, c - (notification.read_at ? 0 : 1)));
    } catch {
      // Not worth blocking navigation over - worst case it stays unread until the next poll.
    }
    if (notification.flag_id) {
      router.push(`/dashboard/flags/${notification.flag_id}`);
    } else if (notification.type?.startsWith('approval_')) {
      router.push('/dashboard/approvals');
    }
  }

  return (
    <div className="relative">
      <button onClick={handleToggle} className="relative text-gray-600 hover:text-gray-900" aria-label="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-4-5.66V5a2 2 0 1 0-4 0v.34A6 6 0 0 0 6 11v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
        </svg>
        {(unreadCount + myUnreadCount) > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
            {(unreadCount + myUnreadCount) > 9 ? '9+' : unreadCount + myUnreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
          {myItems.length > 0 && (
            <>
              <div className="p-3 border-b text-sm font-medium bg-amber-50">Flags & approvals</div>
              {myItems.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleMyNotificationClick(n)}
                  className={`w-full text-left p-3 text-sm border-b hover:bg-gray-50 transition-colors ${!n.read_at ? 'font-medium' : 'text-gray-500'}`}
                >
                  <p>{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                </button>
              ))}
            </>
          )}
          <div className="p-3 border-b text-sm font-medium">Recent changes</div>
          {items.length === 0 && <p className="p-4 text-sm text-gray-500">No recent activity.</p>}
          {items.map((entry) => {
            const route = notificationRoute(entry);
            const content = (
              <>
                <p>{describe(entry)}</p>
                <p className="text-xs text-gray-400 mt-1">{timeAgo(entry.created_at)}</p>
              </>
            );
            return route ? (
              <button
                key={entry.id}
                onClick={() => {
                  setOpen(false);
                  router.push(route);
                }}
                className="w-full text-left p-3 text-sm border-b last:border-b-0 hover:bg-gray-50 transition-colors"
              >
                {content}
              </button>
            ) : (
              <div key={entry.id} className="p-3 text-sm border-b last:border-b-0">
                {content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
