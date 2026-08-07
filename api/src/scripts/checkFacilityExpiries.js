/**
 * Entrypoint for a third Render Cron Job: `node src/scripts/checkFacilityExpiries.js`.
 * Runs once and exits, same pattern as checkFacilityArrears.js. Checks
 * facility documents/security insurance nearing or past expiry, and
 * covenant tests nearing or past their due date.
 */
const { checkFacilityExpiries } = require('../services/facilityExpiryAlertService');

checkFacilityExpiries()
  .then((results) => {
    // eslint-disable-next-line no-console
    console.log(
      `Facility expiry check complete: ${results.documentsExpiring} docs expiring, ${results.documentsExpired} docs expired, ` +
        `${results.securityExpiring} insurance expiring, ${results.securityExpired} insurance expired, ` +
        `${results.covenantsDue} covenant tests due, ${results.covenantsOverdue} covenant tests overdue.`
    );
    process.exit(0);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Facility expiry check failed:', err);
    process.exit(1);
  });
