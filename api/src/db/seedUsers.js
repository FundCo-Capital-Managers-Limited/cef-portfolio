// One-off script: creates one CEF staff account per role plus one
// assetco_admin per seeded AssetCo, so the team can log in and see exactly
// what each role sees. Run manually against the DEV project only:
//
//   node api/src/db/seedUsers.js
//
// Uses the real Supabase Admin API (via SUPABASE_SECRET_KEY) — this creates
// live auth accounts, so it is not wired into any test suite or automated
// pipeline. Safe to re-run: skips any email that already has a `users` row.

const supabase = require('../config/supabase');
const userService = require('../services/userService');

const ACCOUNTS = [
  { email: 'executive@fundco.ng', role: 'executive' },
  { email: 'management@fundco.ng', role: 'management' },
  { email: 'finance@fundco.ng', role: 'finance' },
  { email: 'ops@fundco.ng', role: 'ops' },
  { email: 'risk@fundco.ng', role: 'risk' },
  // management/executive/it_admin already get IC Engagement access
  // automatically — this is a demo of the opt-in path (a finance person who's
  // also on the IC), for testing that can_access_ic actually grants access
  // without changing their PIP role/permissions.
  { email: 'finance-ic@fundco.ng', role: 'finance', canAccessIc: true },
  // it@fundco.ng already exists from earlier manual setup — skipped here.
  { email: 'admin@grosolar.example.com', role: 'assetco_admin', assetcoId: 'GROSOLAR' },
  { email: 'admin@emlgrid.example.com', role: 'assetco_admin', assetcoId: 'EMLGRID' },
  { email: 'admin@ssmobility.example.com', role: 'assetco_admin', assetcoId: 'SSMOBILITY' },
  { email: 'admin@brightgrid.example.com', role: 'assetco_admin', assetcoId: 'BRIGHTGRID' },
  { email: 'admin@demosolar.example.com', role: 'assetco_admin', assetcoId: 'DEMOSOLAR' },
];

async function main() {
  const { data: existing } = await supabase.from('users').select('email');
  const existingEmails = new Set((existing || []).map((u) => u.email));

  const created = [];
  for (const account of ACCOUNTS) {
    if (existingEmails.has(account.email)) {
      console.log(`Skipping ${account.email} — already provisioned.`);
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const { user, tempPassword } = await userService.createUser(account);
    created.push({ email: user.email, role: user.role, assetcoId: user.assetco_id, tempPassword });
    console.log(`Created ${user.email} (${user.role})`);
  }

  console.log('\n--- Temporary passwords (share securely, rotate before deployment) ---');
  created.forEach((c) => console.log(`${c.email}: ${c.tempPassword}`));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('seedUsers failed:', err);
    process.exit(1);
  });
