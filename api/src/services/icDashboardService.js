const supabase = require('../config/supabase');

const TERMINAL_CONDITION_STATUSES = ['SATISFIED', 'WAIVED'];

// Deliberately basic per Milestone 9's own scope — a few counts and short
// lists, not the full CIO/member/portfolio dashboard split from the scope
// doc's Section 17. Fetches broader sets and filters in JS rather than
// adding new SQL-side filter types (lt/not) to the fake test client for
// what's a handful of small tables in a small-team tool.
async function getSummary(user) {
  const todayIso = new Date().toISOString().slice(0, 10);

  const [{ data: allMatters, error: mattersError }, { data: allMeetings, error: meetingsError }, { data: allConditions, error: conditionsError }] =
    await Promise.all([
      supabase.from('ic_matters').select('*').order('created_at', { ascending: false }),
      supabase.from('ic_meetings').select('*').order('meeting_date', { ascending: true }),
      supabase.from('ic_conditions').select('*'),
    ]);
  if (mattersError) throw mattersError;
  if (meetingsError) throw meetingsError;
  if (conditionsError) throw conditionsError;

  const openMatters = (allMatters || []).filter((m) => m.status === 'OPEN' || m.status === 'UNDER_REVIEW');
  const upcomingMeetings = (allMeetings || []).filter((m) => m.status === 'SCHEDULED' && m.meeting_date >= new Date().toISOString());
  const openConditions = (allConditions || []).filter((c) => !TERMINAL_CONDITION_STATUSES.includes(c.status));
  const overdueConditions = openConditions.filter((c) => c.due_date && c.due_date < todayIso);
  const myConditions = openConditions.filter((c) => c.owner_user_id === user.id);

  return {
    openMattersCount: openMatters.length,
    openMatters: openMatters.slice(0, 5),
    upcomingMeetingsCount: upcomingMeetings.length,
    upcomingMeetings: upcomingMeetings.slice(0, 5),
    overdueConditionsCount: overdueConditions.length,
    overdueConditions: overdueConditions.slice(0, 5),
    myConditionsCount: myConditions.length,
    myConditions: myConditions.sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999')).slice(0, 5),
  };
}

module.exports = { getSummary };
