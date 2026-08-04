// One-off script: populates the rest of the IC Engagement portal (roster,
// meetings/agenda, votes/decisions, conditions, and locked minutes) so a
// walkthrough isn't staring at empty pages beyond the matter register
// seedIcMatters.js already covers. Run manually against the DEV project
// only, after seedUsers.js and seedIcMatters.js:
//
//   node api/src/db/seedIcEngagement.js
//
// Safe to re-run: skips if the committee roster already has members.

const supabase = require('../config/supabase');
const icCommitteeService = require('../services/icCommitteeService');
const icMeetingService = require('../services/icMeetingService');
const icVotingService = require('../services/icVotingService');
const icConditionService = require('../services/icConditionService');
const icMinutesService = require('../services/icMinutesService');

async function findUser(email) {
  const { data, error } = await supabase.from('users').select('id, email, role').eq('email', email).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Expected seeded user ${email} not found — run seedUsers.js first.`);
  return data;
}

async function findMatterByTitle(titleFragment) {
  const { data, error } = await supabase.from('ic_matters').select('*').like('title', `${titleFragment}%`).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Expected seeded matter starting with "${titleFragment}" not found — run seedIcMatters.js first.`);
  return data;
}

async function main() {
  const { data: existingRoster, error: rosterCheckError } = await supabase.from('ic_committee_members').select('id').limit(1);
  if (rosterCheckError) throw rosterCheckError;
  if (existingRoster?.length) {
    console.log('ic_committee_members already has data — skipping seed.');
    return;
  }

  const [mgmt, exec, itAdmin, financeIc, risk] = await Promise.all([
    findUser('management@fundco.ng'),
    findUser('executive@fundco.ng'),
    findUser('it@fundco.ng'),
    findUser('finance-ic@fundco.ng'),
    findUser('risk@fundco.ng'),
  ]);

  console.log('Building committee roster...');
  await icCommitteeService.addMember({ userId: mgmt.id, isChair: true, isSecretary: false }, mgmt);
  await icCommitteeService.addMember({ userId: financeIc.id, isChair: false, isSecretary: true }, mgmt);
  await icCommitteeService.addMember({ userId: exec.id, isChair: false, isSecretary: false }, mgmt);
  await icCommitteeService.addMember({ userId: itAdmin.id, isChair: false, isSecretary: false }, mgmt);
  await icCommitteeService.addMember({ userId: risk.id, isChair: false, isSecretary: false }, mgmt);
  console.log('Roster: mgmt (chair), finance-ic (secretary), exec, it, risk.');

  const hnlMatter = await findMatterByTitle('HNL');
  const magnificentMatter = await findMatterByTitle('Magnificent');
  const groSolarMatter = await findMatterByTitle('GroSolar');
  const emlMatter = await findMatterByTitle('EML Grid');
  const policyMatter = await findMatterByTitle('Solar-sector');

  console.log('Creating a completed past meeting with decided matters...');
  const pastMeeting = await icMeetingService.createMeeting(
    {
      meetingDate: new Date(Date.now() - 14 * 86400000).toISOString(),
      teamsLink: 'https://teams.microsoft.com/l/meetup-join/ic-standing-meeting',
      chairUserId: mgmt.id,
      secretaryUserId: financeIc.id,
    },
    mgmt
  );
  await icMeetingService.addAgendaItem(pastMeeting.id, hnlMatter.id, 'Covenant breach review', mgmt);
  await icMeetingService.addAgendaItem(pastMeeting.id, magnificentMatter.id, 'Watchlist placement', mgmt);

  for (const voter of [mgmt, financeIc, exec, itAdmin, risk]) {
    // eslint-disable-next-line no-await-in-loop
    await icVotingService.castVote(pastMeeting.id, hnlMatter.id, 'APPROVE', voter);
    // eslint-disable-next-line no-await-in-loop
    await icVotingService.castVote(pastMeeting.id, magnificentMatter.id, 'APPROVE', voter);
  }
  await icVotingService.recordDecision(pastMeeting.id, hnlMatter.id, 'APPROVED_WITH_CONDITIONS', mgmt);
  await icVotingService.recordDecision(pastMeeting.id, magnificentMatter.id, 'NOTED', mgmt);
  await icMeetingService.updateMeeting(pastMeeting.id, { status: 'COMPLETED' }, mgmt);

  console.log('Adding conditions on the approved HNL matter...');
  await icConditionService.createCondition(
    hnlMatter.id,
    {
      decisionId: null,
      type: 'COVENANT',
      wording: 'Maintain Debt Service Coverage Ratio > 1.25x, tested bi-annually.',
      ownerUserId: financeIc.id,
      dueDate: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
    },
    mgmt
  );
  await icConditionService.createCondition(
    hnlMatter.id,
    {
      decisionId: null,
      type: 'MONITORING_REQUIREMENT',
      wording: 'Submit updated financial model reflecting the 7-year restructure terms.',
      ownerUserId: risk.id,
      dueDate: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
    },
    mgmt
  );

  console.log('Drafting and locking minutes for the completed meeting...');
  await icMinutesService.updateMinutes(
    pastMeeting.id,
    {
      content:
        'IC reviewed the HNL covenant breach and the Magnificent Projects watchlist placement. ' +
        'HNL: approved with conditions (DSCR covenant, updated financial model). ' +
        'Magnificent: noted for ongoing monitoring, no further action required at this time.',
      status: 'UNDER_REVIEW',
    },
    mgmt
  );
  await icMinutesService.lockMinutes(pastMeeting.id, mgmt);

  console.log('Creating an upcoming scheduled meeting with the remaining open matters...');
  const upcomingMeeting = await icMeetingService.createMeeting(
    {
      meetingDate: new Date(Date.now() + 10 * 86400000).toISOString(),
      teamsLink: 'https://teams.microsoft.com/l/meetup-join/ic-standing-meeting',
      chairUserId: mgmt.id,
      secretaryUserId: financeIc.id,
    },
    mgmt
  );
  await icMeetingService.addAgendaItem(upcomingMeeting.id, groSolarMatter.id, null, mgmt);
  await icMeetingService.addAgendaItem(upcomingMeeting.id, emlMatter.id, null, mgmt);
  await icMeetingService.addAgendaItem(upcomingMeeting.id, policyMatter.id, null, mgmt);

  console.log('Done. Committee roster, two meetings (one completed/locked, one upcoming), votes, decisions, conditions, and minutes are seeded.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('seedIcEngagement failed:', err);
    process.exit(1);
  });
