const supabase = require('../config/supabase');
const seriesService = require('./seriesService');
const notificationService = require('./notificationService');
const { sendApprovalRequestedEmail, sendApprovalDecidedEmail } = require('./approvalEmailService');

// Who can approve/reject - the same roles that could already write series
// data directly before this workflow existed. Everyone else only sees the
// status of their own submissions (enforced by RLS + listForUser below).
const APPROVER_ROLES = ['management', 'it_admin'];

async function approverEmails() {
  const { data, error } = await supabase.from('users').select('email').in('role', APPROVER_ROLES);
  if (error) throw error;
  return (data || []).map((u) => u.email);
}

async function createRequest({ actionType, targetSeriesId, payload }, user) {
  const { data: request, error } = await supabase
    .from('approval_requests')
    .insert({
      action_type: actionType,
      target_series_id: targetSeriesId || null,
      payload,
      status: 'pending',
      requested_by_user_id: user.id,
      requested_by_email: user.email,
    })
    .select()
    .single();
  if (error) throw error;

  const recipientEmails = await approverEmails();
  await notificationService.notify({
    type: 'approval_requested',
    message: `${user.email} submitted a ${actionType.replace('SERIES_', '').toLowerCase()} request awaiting approval`,
    createdByEmail: user.email,
    recipientEmails,
  });
  await sendApprovalRequestedEmail({ requesterEmail: user.email, actionType, payload, recipientEmails });

  return request;
}

async function listForUser(user) {
  let query = supabase.from('approval_requests').select('*');
  if (!APPROVER_ROLES.includes(user.role)) {
    query = query.eq('requested_by_user_id', user.id);
  }
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function getRequest(id) {
  const { data, error } = await supabase.from('approval_requests').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw Object.assign(new Error('Approval request not found'), { status: 404 });
  return data;
}

async function decide(id, decision, user, notes) {
  if (!['approved', 'rejected'].includes(decision)) {
    throw Object.assign(new Error('decision must be either approved or rejected'), { status: 400 });
  }
  const request = await getRequest(id);
  if (request.status !== 'pending') {
    throw Object.assign(new Error(`This request has already been ${request.status}`), { status: 400 });
  }

  if (decision === 'approved') {
    const requester = { id: request.requested_by_user_id, email: request.requested_by_email };
    if (request.action_type === 'SERIES_CREATE') {
      await seriesService.createSeries(request.payload, requester);
    } else if (request.action_type === 'SERIES_UPDATE') {
      await seriesService.updateSeries(request.target_series_id, request.payload, requester);
    } else if (request.action_type === 'SERIES_DELETE') {
      await seriesService.deleteSeries(request.target_series_id, requester);
    }
  }

  const { data: updated, error } = await supabase
    .from('approval_requests')
    .update({
      status: decision,
      decided_by_email: user.email,
      decided_at: new Date().toISOString(),
      decision_notes: notes || null,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;

  await notificationService.notify({
    type: decision === 'approved' ? 'approval_approved' : 'approval_rejected',
    message: `Your ${request.action_type.replace('SERIES_', '').toLowerCase()} request was ${decision} by ${user.email}`,
    createdByEmail: user.email,
    recipientEmails: [request.requested_by_email],
  });
  await sendApprovalDecidedEmail({ requesterEmail: request.requested_by_email, decision, actionType: request.action_type, decidedBy: user.email });

  return updated;
}

module.exports = { createRequest, listForUser, getRequest, decide, APPROVER_ROLES };
