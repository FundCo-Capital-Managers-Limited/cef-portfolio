const icConditionService = require('../services/icConditionService');
const icMeetingService = require('../services/icMeetingService');

const TERMINAL_CONDITION_STATUSES = ['SATISFIED', 'WAIVED'];

// Secretariat dashboard (Abiodun's ask, 2026-08-05 walkthrough): meeting
// organization/minutes and conditions/actions tracking are both secretariat
// functions, combined into one view rather than requiring a click through
// two separate pages.
async function getView(req, res, next) {
  try {
    const [allConditions, meetings] = await Promise.all([
      icConditionService.listAllWithMatterTitle(),
      icMeetingService.listMeetingsWithMinutesStatus(),
    ]);
    const openConditions = allConditions.filter((c) => !TERMINAL_CONDITION_STATUSES.includes(c.status));
    const meetingsNeedingMinutes = meetings.filter((m) => m.status === 'COMPLETED' && m.minutes_status !== 'LOCKED');

    res.status(200).json({ openConditions, meetings, meetingsNeedingMinutes });
  } catch (err) {
    next(err);
  }
}

module.exports = { getView };
