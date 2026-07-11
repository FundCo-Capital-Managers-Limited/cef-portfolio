// Mirrors api/src/utils/assetcoEnums.js — kept in sync manually since the
// dashboard and api are separate npm packages in this monorepo.
export const PIPELINE_STAGES = ['ONBOARDING', 'DUE_DILIGENCE', 'IC_APPROVAL', 'DISBURSEMENT', 'PORTFOLIO_MONITORING'];

export const PIPELINE_STAGE_LABELS = {
  ONBOARDING: 'Onboarding',
  DUE_DILIGENCE: 'Due Diligence',
  IC_APPROVAL: 'IC Approval',
  DISBURSEMENT: 'Disbursement',
  PORTFOLIO_MONITORING: 'Portfolio Monitoring',
};

export const DREEF_STAGES = ['NOT_STARTED', 'INITIAL_ASSESSMENT', 'MANDATED', 'UNDER_GUARANTEE', 'DISBURSED', 'NOT_APPLICABLE'];

export const DREEF_STAGE_LABELS = {
  NOT_STARTED: 'Not Started',
  INITIAL_ASSESSMENT: 'Initial Assessment',
  MANDATED: 'Mandated',
  UNDER_GUARANTEE: 'Under Guarantee',
  DISBURSED: 'Disbursed / Active',
  NOT_APPLICABLE: 'Not Applicable',
};

export const GUARANTEE_TYPES = ['CREDIT_GUARANTEE', 'CFBF_CO_FINANCE', 'BOTH', 'NONE'];

export const INSTRUMENT_TYPES = ['EQUITY', 'DEBT', 'CONVERTIBLE', 'GRANT'];
export const SERIES_LINK_STATUSES = ['CANDIDATE', 'COMMITTED', 'DISBURSED', 'EXITED'];

export const CUSTOMER_STATUSES = ['PIPELINE', 'ASSET_ORDERED', 'INSTALLATION_SCHEDULED', 'ACTIVE', 'IN_ARREARS', 'DEFAULTED', 'CHURNED'];

export const FACILITY_TYPES = ['LOAN', 'EQUITY', 'CONVERTIBLE_NOTE', 'GRANT', 'BLENDED'];
export const REPAYMENT_FREQUENCIES = ['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'BULLET', 'FLEXIBLE'];
export const FACILITY_STATUSES = ['ACTIVE', 'FULLY_REPAID', 'IN_ARREARS', 'IN_DEFAULT', 'RESTRUCTURED', 'WRITTEN_OFF'];
export const PAYMENT_TYPES = ['SCHEDULED', 'EARLY_REPAYMENT', 'PARTIAL', 'RESTRUCTURED_PAYMENT'];

export const OWNERSHIP_MODELS = ['OUTRIGHT_PURCHASE', 'LEASE_TO_OWN', 'PAYG_METERED'];

export const OWNERSHIP_MODEL_LABELS = {
  OUTRIGHT_PURCHASE: 'Outright Purchase',
  LEASE_TO_OWN: 'Lease-to-Own',
  PAYG_METERED: 'Energy as a Service',
};

export const USER_ROLES = ['executive', 'management', 'finance', 'ops', 'it_admin', 'assetco_admin', 'assetco_dev'];

export const USER_ROLE_LABELS = {
  executive: 'Executive',
  management: 'Management',
  finance: 'Finance',
  ops: 'Operations',
  it_admin: 'IT Admin',
  assetco_admin: 'AssetCo Admin',
  assetco_dev: 'AssetCo Developer',
};

export const FACILITY_STATUS_STYLES = {
  ACTIVE: 'bg-blue-100 text-blue-700',
  IN_ARREARS: 'bg-amber-100 text-amber-700',
  IN_DEFAULT: 'bg-red-100 text-red-700',
  FULLY_REPAID: 'bg-green-100 text-green-700',
  RESTRUCTURED: 'bg-purple-100 text-purple-700',
  WRITTEN_OFF: 'bg-gray-100 text-gray-500',
};
