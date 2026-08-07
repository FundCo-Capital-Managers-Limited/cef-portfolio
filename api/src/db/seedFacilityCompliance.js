// One-off script: populates the new credit-risk registers (documents,
// security, covenants, a pending repayment notification) on the existing
// seeded facilities, so the Loan Book detail pages and risk-summary tiles
// aren't empty during a walkthrough. Run manually against the DEV project
// only, after seed.sql:
//
//   node api/src/db/seedFacilityCompliance.js
//
// Safe to re-run: skips if facility_documents already has data.

const supabase = require('../config/supabase');
const facilityComplianceService = require('../services/facilityComplianceService');
const repaymentNotificationService = require('../services/facilityRepaymentNotificationService');

async function findUser(email) {
  const { data, error } = await supabase.from('users').select('id, email, role').eq('email', email).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Expected seeded user ${email} not found — run seedUsers.js first.`);
  return data;
}

async function findFacility(reference) {
  const { data, error } = await supabase.from('cef_facilities').select('*').eq('facility_reference', reference).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Expected seeded facility ${reference} not found — run seed.sql first.`);
  return data;
}

async function main() {
  const { data: existing, error } = await supabase.from('facility_documents').select('id').limit(1);
  if (error) throw error;
  if (existing?.length) {
    console.log('facility_documents already has data — skipping seed.');
    return;
  }

  const [mgmt, risk, adminDemosolar] = await Promise.all([
    findUser('management@fundco.ng'),
    findUser('risk@fundco.ng'),
    findUser('admin@demosolar.example.com'),
  ]);

  const demosolarFacility = await findFacility('CEF-FAC-DEMOSOLAR-001');
  const brightgridFacility = await findFacility('CEF-FAC-BRIGHTGRID-001');

  console.log('Adding documents...');
  await facilityComplianceService.addDocument(demosolarFacility.id, { title: 'Executed Construction Loan Note Agreement', classification: 'Loan Note Agreement', sharepointUrl: 'https://fundco.sharepoint.com/sites/credit-dataroom/demosolar/loan-note.pdf' }, mgmt);
  const boardResolution = await facilityComplianceService.addDocument(demosolarFacility.id, { title: 'Board Resolution to Borrow', classification: 'Board Resolution' }, mgmt);
  await facilityComplianceService.updateDocument(boardResolution.id, { status: 'DRAFT' }, mgmt);
  await facilityComplianceService.addDocument(brightgridFacility.id, { title: 'Personal Guarantee (Sponsor Director)', classification: 'Guarantee' }, risk);

  console.log('Confirming the first document as uploaded...');
  const { data: docs } = await supabase.from('facility_documents').select('*').eq('facility_id', demosolarFacility.id);
  const executedDoc = docs.find((d) => d.title.includes('Loan Note'));
  await facilityComplianceService.updateDocument(executedDoc.id, { status: 'EXECUTED' }, mgmt);
  await facilityComplianceService.confirmDocumentUpload(executedDoc.id, mgmt);

  console.log('Adding security records...');
  await facilityComplianceService.addSecurity(demosolarFacility.id, {
    securityType: 'All-Assets Fixed & Floating Debenture',
    valueNgn: Number(demosolarFacility.principal_amount_ngn) * 0.6,
    perfectionStatus: 'Pending Upstamping',
    insuranceStatus: 'Sighted Asset Policy - Needs Renewal Log',
  }, risk);
  await facilityComplianceService.addSecurity(brightgridFacility.id, {
    securityType: 'Charge on Operational Contract Receivables',
    perfectionStatus: 'Unregistered',
    insuranceStatus: 'Missing in Source Documents',
  }, risk);

  console.log('Adding covenants...');
  const dscrCovenant = await facilityComplianceService.addCovenant(demosolarFacility.id, {
    covenantDescription: 'Maintain Debt Service Coverage Ratio > 1.25x',
    covenantType: 'FINANCIAL',
    frequency: 'Bi-Annual',
  }, risk);
  await facilityComplianceService.updateCovenant(dscrCovenant.id, { complianceStatus: 'PENDING' }, risk);

  const reportingCovenant = await facilityComplianceService.addCovenant(brightgridFacility.id, {
    covenantDescription: 'Provide Monthly Project Progress Reports',
    covenantType: 'REPORTING',
    frequency: 'Monthly',
  }, risk);
  await facilityComplianceService.updateCovenant(reportingCovenant.id, { complianceStatus: 'NON_COMPLIANT' }, risk);

  console.log('Submitting a pending repayment notification...');
  await repaymentNotificationService.submitNotification(demosolarFacility.id, {
    amountNgn: 250000,
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentReference: 'GTB-TRF-88213',
    notes: 'Monthly repayment for this period, paid via bank transfer.',
  }, adminDemosolar);

  console.log('Done. Documents, security, covenants, and a pending repayment notification are seeded.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('seedFacilityCompliance failed:', err);
    process.exit(1);
  });
