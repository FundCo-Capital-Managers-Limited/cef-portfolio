'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabaseClient';
import { timeAgo } from '../../lib/format';
import { notificationRoute } from '../../lib/entityRoutes';

const POLL_INTERVAL_MS = 30000;

function describe(entry) {
  const action = entry.action.replace(/_/g, ' ').toLowerCase();
  return `${entry.entity_type} ${entry.entity_id} — ${action}`;
}

export default function NotificationBell({ userId }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState([]);
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

    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, POLL_INTERVAL_MS);
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
  }

  return (
    <div className="relative">
      <button onClick={handleToggle} className="relative text-gray-600 hover:text-gray-900" aria-label="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-4-5.66V5a2 2 0 1 0-4 0v.34A6 6 0 0 0 6 11v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
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
