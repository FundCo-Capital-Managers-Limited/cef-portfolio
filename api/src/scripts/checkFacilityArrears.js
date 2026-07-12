/**
 * Entrypoint for a second Render Cron Job: `node src/scripts/checkFacilityArrears.js`.
 * Runs once and exits, same pattern as runReconciliation.js. Checks for
 * missed CEF facility repayments (ALT-14), 7-day escalations (ALT-15), and
 * facilities approaching maturity with a balance outstanding (ALT-16).
 */
const { checkFacilityArrears } = require('../services/facilityService');

checkFacilityArrears()
  .then((results) => {
    // eslint-disable-next-line no-console
    console.log(
      `Facility arrears check complete: ${results.missed} newly missed, ${results.overdue7Days} escalated to 7-days-overdue, ${results.approachingMaturity} approaching-maturity alerts sent.`
    );
    process.exit(0);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Facility arrears check failed:', err);
    process.exit(1);
  });
