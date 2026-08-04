const supabase = require('../config/supabase');
const { recordAudit } = require('./auditLog');
const facilityService = require('./facilityService');
const notificationService = require('./notificationService');

// AssetCos repay CEF by bank transfer and notify CEF separately - they never
// record a repayment on the platform directly (see the CEF_STAFF_ONLY gate
// on facilityController.recordRepayment). This is that notification: an
// AssetCo rep submits "we paid X", and finance/risk/portfolio staff confirm
// it before it becomes a real cef_facility_repayments row.
const CEF_STAFF_ROLES = ['management', 'it_admin', 'finance', 'risk'];

async function getFacility(facilityId) {
  const { data: facility, error } = await supabase.from('cef_facilities').select('*').eq('id', facilityId).maybeSingle();
  if (error) throw error;
  if (!facility) throw Object.assign(new Error('Facility not found'), { status: 404 });
  return facility;
}

async function submitNotification(facilityId, { amountNgn, paymentDate, paymentReference, periodCovered, notes }, user) {
  if (!amountNgn || !paymentDate) throw Object.assign(new Error('amountNgn and paymentDate are required'), { status: 400 });
  const facility = await getFacility(facilityId);

  const { data: notification, error } = await supabase
    .from('facility_repayment_notifications')
    .insert({
      facility_id: facilityId,
      assetco_id: facility.assetco_id,
      amount_ngn: amountNgn,
      payment_date: paymentDate,
      payment_reference: paymentReference || null,
      period_covered: periodCovered || null,
      notes: notes || null,
      status: 'PENDING',
      submitted_by_user_id: user.id,
      submitted_by_email: user.email,
    })
    .select()
    .single();
  if (error) throw error;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorEmail: user.email,
    actorAssetcoId: facility.assetco_id,
    action: 'FACILITY_REPAYMENT_NOTIFIED',
    entityType: 'cef_facility',
    entityId: facilityId,
    details: { amountNgn, paymentDate, paymentReference },
  });

  const { data: staff, error: staffError } = await supabase.from('users').select('email').in('role', CEF_STAFF_ROLES);
  if (staffError) throw staffError;
  await notificationService.notify({
    type: 'facility_repayment_notified',
    message: `${user.email} notified a repayment of ₦${Number(amountNgn).toLocaleString()} on facility ${facility.facility_reference || facilityId}, awaiting confirmation`,
    createdByEmail: user.email,
    recipientEmails: (staff || []).map((s) => s.email).filter((e) => e !== user.email),
  });

  return notification;
}

async function listForFacility(facilityId) {
  const { data, error } = await supabase
    .from('facility_repayment_notifications')
    .select('*')
    .eq('facility_id', facilityId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function listPending() {
  const { data, error } = await supabase
    .from('facility_repayment_notifications')
    .select('*')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function getNotification(notificationId) {
  const { data, error } = await supabase.from('facility_repayment_notifications').select('*').eq('id', notificationId).maybeSingle();
  if (error) throw error;
  if (!data) throw Object.assign(new Error('Repayment notification not found'), { status: 404 });
  return data;
}

function assertCefStaff(user) {
  if (!CEF_STAFF_ROLES.includes(user.role)) {
    throw Object.assign(new Error('Only Finance, Risk, IT Admin, or Management can confirm or reject a repayment notification'), { status: 403 });
  }
}

async function confirmNotification(notificationId, user) {
  assertCefStaff(user);
  const notification = await getNotification(notificationId);
  if (notification.status !== 'PENDING') {
    throw Object.assign(new Error(`This notification has already been ${notification.status.toLowerCase()}`), { status: 400 });
  }

  // Reuses the exact same repayment-recording logic a staff member would use
  // if entering it directly - the notification is just what triggered it.
  const facility = await facilityService.recordRepayment(
    notification.facility_id,
    {
      payment_date: notification.payment_date,
      principal_paid_ngn: notification.amount_ngn,
      interest_paid_ngn: 0,
      fees_paid_ngn: 0,
      payment_reference: notification.payment_reference,
      payment_type: 'SCHEDULED',
      period_covered: notification.period_covered,
      notes: `Confirmed from repayment notification submitted by ${notification.submitted_by_email}.${notification.notes ? ` Notes: ${notification.notes}` : ''}`,
    },
    user
  );

  const { data: repayments, error: repaymentsError } = await supabase
    .from('cef_facility_repayments')
    .select('id')
    .eq('facility_id', notification.facility_id)
    .order('created_at', { ascending: false })
    .limit(1);
  if (repaymentsError) throw repaymentsError;
  const resultingRepaymentId = repayments?.[0]?.id || null;

  const { data: updated, error } = await supabase
    .from('facility_repayment_notifications')
    .update({
      status: 'CONFIRMED',
      confirmed_by_user_id: user.id,
      confirmed_by_email: user.email,
      confirmed_at: new Date().toISOString(),
      resulting_repayment_id: resultingRepaymentId,
    })
    .eq('id', notificationId)
    .select()
    .single();
  if (error) throw error;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorEmail: user.email,
    actorAssetcoId: notification.assetco_id,
    action: 'FACILITY_REPAYMENT_NOTIFICATION_CONFIRMED',
    entityType: 'cef_facility',
    entityId: notification.facility_id,
    details: { notificationId, resultingRepaymentId },
  });

  return { notification: updated, facility };
}

async function rejectNotification(notificationId, reason, user) {
  assertCefStaff(user);
  const notification = await getNotification(notificationId);
  if (notification.status !== 'PENDING') {
    throw Object.assign(new Error(`This notification has already been ${notification.status.toLowerCase()}`), { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from('facility_repayment_notifications')
    .update({
      status: 'REJECTED',
      confirmed_by_user_id: user.id,
      confirmed_by_email: user.email,
      confirmed_at: new Date().toISOString(),
      rejection_reason: reason || null,
    })
    .eq('id', notificationId)
    .select()
    .single();
  if (error) throw error;

  await recordAudit({
    actorType: 'user',
    actorUserId: user.id,
    actorEmail: user.email,
    actorAssetcoId: notification.assetco_id,
    action: 'FACILITY_REPAYMENT_NOTIFICATION_REJECTED',
    entityType: 'cef_facility',
    entityId: notification.facility_id,
    details: { notificationId, reason },
  });

  await notificationService.notify({
    type: 'facility_repayment_rejected',
    message: `Your repayment notification of ₦${Number(notification.amount_ngn).toLocaleString()} was rejected: ${reason || 'no reason given'}`,
    createdByEmail: user.email,
    recipientEmails: [notification.submitted_by_email].filter((e) => e && e !== user.email),
  });

  return updated;
}

module.exports = { submitNotification, listForFacility, listPending, getNotification, confirmNotification, rejectNotification, CEF_STAFF_ROLES };
