export function formatCurrency(amount, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
    amount || 0
  );
}

export function formatDateTime(value) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export function timeAgo(value) {
  if (!value) return 'never';
  const diffMs = Date.now() - new Date(value).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
