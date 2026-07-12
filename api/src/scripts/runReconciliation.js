/**
 * Entrypoint for the Render Cron Job: `node src/scripts/runReconciliation.js`.
 * Runs once and exits — Render's scheduler handles the "nightly" cadence
 * (see RECONCILIATION_CRON in .env.example), this script has no loop of its own.
 */
const { runNightlyReconciliation } = require('../services/reconciliationService');

runNightlyReconciliation()
  .then((results) => {
    // eslint-disable-next-line no-console
    console.log(`Reconciliation complete: ${results.length} AssetCo(s) checked`);
    results.forEach((r) => {
      // eslint-disable-next-line no-console
      console.log(`  ${r.assetCoId}: ${r.status}${r.mismatches?.length ? ` (${r.mismatches.length} mismatch(es))` : ''}`);
    });
    process.exit(0);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Reconciliation run failed:', err);
    process.exit(1);
  });
