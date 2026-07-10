// Maps an audit_log entry (entity_type/entity_id + actor_assetco_id) or an
// alerts row (asset_id/facility_id/assetco_id) to the dashboard page it's
// about, so notifications and alerts are clickable rather than dead text.
// actor_assetco_id doubles as "the AssetCo this change relates to" for every
// audit action currently recorded (see auditLog.js call sites) — it's always
// set to the AssetCo the mutated entity belongs to, not just the actor's own.

export function notificationRoute(entry) {
  const assetcoId = entry.actor_assetco_id;
  if (!assetcoId) return null;

  switch (entry.entity_type) {
    case 'assetco':
      return `/dashboard/${assetcoId}/profile`;
    case 'customer':
      return `/dashboard/${assetcoId}/customers/${entry.entity_id}`;
    case 'asset':
      return `/dashboard/${assetcoId}/assets/${entry.entity_id}`;
    case 'payment':
      return `/dashboard/${assetcoId}`;
    case 'cef_facility':
    case 'cef_facility_repayment':
    case 'infracredit_relationship':
    case 'assetco_series':
      return `/dashboard/${assetcoId}/profile`;
    default:
      return `/dashboard/${assetcoId}`;
  }
}

export function alertRoute(alert) {
  if (alert.asset_id) return `/dashboard/${alert.assetco_id}/assets/${alert.asset_id}`;
  if (alert.facility_id) return `/dashboard/${alert.assetco_id}/profile`;
  if (alert.assetco_id) return `/dashboard/${alert.assetco_id}`;
  return null;
}
