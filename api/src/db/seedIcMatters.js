// One-off script: seeds a handful of sample IC Matters spanning every
// category/status, so the Matter Register page has something to look at
// during a demo/walkthrough instead of an empty list. Run manually against
// the DEV project only:
//
//   node api/src/db/seedIcMatters.js
//
// Safe to re-run: skips if any ic_matters rows already exist, rather than
// duplicating on every run.

const supabase = require('../config/supabase');
const icMatterService = require('../services/icMatterService');

const SAMPLE_MATTERS = [
  {
    category: 'NEW_INVESTMENT',
    decisionType: 'Preliminary approval',
    title: 'GroSolar Series C expansion facility',
    description: 'Indicative NGN 500m facility to fund GroSolar\'s next 2,000-unit rollout across three states.',
    assetcoId: 'GROSOLAR',
  },
  {
    category: 'DISBURSEMENT',
    decisionType: 'First drawdown approval',
    title: 'EML Grid — first tranche drawdown request',
    description: 'Conditions precedent substantially satisfied; requesting release of first tranche.',
    assetcoId: 'EMLGRID',
  },
  {
    category: 'PORTFOLIO_MANAGEMENT',
    decisionType: 'Covenant breach',
    title: 'HNL — DSCR covenant breach review',
    description: 'DSCR fell below the 1.25x threshold in the latest reporting period; awaiting management accounts to confirm severity.',
  },
  {
    category: 'PROBLEM_ASSET',
    decisionType: 'Watchlist placement',
    title: 'Magnificent Projects — watchlist placement',
    description: 'Unsigned core facility documents and a conditioned InfraCredit comfort letter warrant watchlist status pending remediation.',
  },
  {
    category: 'POLICY',
    decisionType: 'Concentration-limit exception',
    title: 'Solar-sector concentration cap exception request',
    description: 'Proposed one-off exception to the sector concentration cap to accommodate the GroSolar Series C facility above.',
  },
];

async function main() {
  const { data: existing, error } = await supabase.from('ic_matters').select('id').limit(1);
  if (error) throw error;
  if (existing?.length) {
    console.log('ic_matters already has data — skipping seed.');
    return;
  }

  const { data: seeder, error: seederError } = await supabase
    .from('users')
    .select('id, email')
    .eq('role', 'management')
    .limit(1)
    .maybeSingle();
  if (seederError) throw seederError;
  if (!seeder) {
    console.error('No management user found to attribute seeded matters to — run seedUsers.js first.');
    process.exit(1);
  }

  for (const matter of SAMPLE_MATTERS) {
    // eslint-disable-next-line no-await-in-loop
    const created = await icMatterService.createMatter(matter, seeder);
    console.log(`Created matter: ${created.title} (${created.category})`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('seedIcMatters failed:', err);
    process.exit(1);
  });
