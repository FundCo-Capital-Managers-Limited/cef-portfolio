const FACILITY_TYPES = ['LOAN', 'EQUITY', 'CONVERTIBLE_NOTE', 'GRANT', 'BLENDED'];
const REPAYMENT_FREQUENCIES = ['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'BULLET', 'FLEXIBLE'];
const FACILITY_STATUSES = ['ACTIVE', 'FULLY_REPAID', 'IN_ARREARS', 'IN_DEFAULT', 'RESTRUCTURED', 'WRITTEN_OFF'];
const PAYMENT_TYPES = ['SCHEDULED', 'EARLY_REPAYMENT', 'PARTIAL', 'RESTRUCTURED_PAYMENT'];
const SCHEDULE_STATUSES = ['PENDING', 'PAID', 'PARTIALLY_PAID', 'MISSED', 'WAIVED'];
const MILESTONE_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED'];
const CHECKLIST_ITEM_STATUSES = ['PENDING', 'DONE', 'NOT_APPLICABLE'];

// Onboarding/gap-diagnostic checklist (Abiodun + Ade, 2026-08-05 walkthrough):
// tied to business model, not individual AssetCo, since one AssetCo can run
// more than one business model (e.g. EML doing both C&I and C2C). Mirrors
// the kind of requirements DREEF/InfraCredit's own onboarding checklists
// carry, kept high-level per the "simplify without losing meaning" principle
// rather than a full template-editor system — these are sensible defaults a
// facility's checklist starts from, not a rigid taxonomy; ad hoc items can
// still be added per facility (see facilityChecklistService.addItem).
const BUSINESS_MODELS = ['C&I', 'C2C', 'PAYG', 'HYBRID'];

const CORE_CHECKLIST_ITEMS = [
  'Certificate of Incorporation / CAC registration sighted',
  'Board resolution authorizing the facility',
  'Signed loan agreement / facility letter executed',
  'KYC on directors and signatories completed',
  'Security/collateral documentation perfected',
  'Insurance policy sighted and current',
  'First financial covenant test scheduled',
];

const DEFAULT_CHECKLIST_ITEMS = {
  'C&I': [...CORE_CHECKLIST_ITEMS, 'Off-taker/corporate contract sighted', 'DREEF/InfraCredit guarantee mandate confirmed (if applicable)'],
  C2C: [...CORE_CHECKLIST_ITEMS, 'Customer onboarding/KYC process audited', 'Asset registry API integration confirmed live'],
  PAYG: [...CORE_CHECKLIST_ITEMS, 'Remote monitoring/lockout capability confirmed', 'Payment collection channel (mobile money/agent network) verified'],
  HYBRID: CORE_CHECKLIST_ITEMS,
};

const MONTHS_PER_PERIOD = { MONTHLY: 1, QUARTERLY: 3, SEMI_ANNUAL: 6, ANNUAL: 12 };

module.exports = {
  FACILITY_TYPES,
  REPAYMENT_FREQUENCIES,
  FACILITY_STATUSES,
  PAYMENT_TYPES,
  SCHEDULE_STATUSES,
  MILESTONE_STATUSES,
  CHECKLIST_ITEM_STATUSES,
  BUSINESS_MODELS,
  DEFAULT_CHECKLIST_ITEMS,
  MONTHS_PER_PERIOD,
};
