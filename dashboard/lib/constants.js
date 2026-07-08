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
