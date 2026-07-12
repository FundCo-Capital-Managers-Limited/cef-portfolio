-- Demo/dev seed data for the DEV Supabase project only. Never run against prod.
--
-- Section 1 (original): a single fictional AssetCo (DEMOSOLAR) with five
-- assets covering the states the dashboard needs to show: current, one
-- missed payment, one defaulted, one with an open fault, one with a resolved
-- fault. This is the same data shape the DemoSolar test harness (Week 5)
-- generates programmatically via real events — this file exists purely so
-- the dashboard has something to display before that harness exists.
--
-- Section 2 (added for Workstream F): more AssetCos, one at each pipeline
-- stage, each with a DREEF relationship at a different stage; DEMOSOLAR
-- backfilled with pipeline/DREEF/Series/Facility data now that those
-- features exist; customers spread across all three deal types; a CEF
-- facility + repayment history with a mix of on-time/missed payments; and
-- enough audit_log activity for the notification feed to have real content.

insert into assetcos (id, name, hmac_secret, is_active)
values ('DEMOSOLAR', 'DemoSolar (fictional AssetCo)', 'demo-secret-change-me', true)
on conflict (id) do nothing;

insert into customers (id, assetco_id, name, sync_status, last_synced_at) values
  ('CUS-0001', 'DEMOSOLAR', 'Ade Okafor', 'SYNCED', now()),
  ('CUS-0002', 'DEMOSOLAR', 'Bola Adeyemi', 'SYNCED', now()),
  ('CUS-0003', 'DEMOSOLAR', 'Chidi Nwosu', 'SYNCED', now()),
  ('CUS-0004', 'DEMOSOLAR', 'Damilola Fashola', 'SYNCED', now()),
  ('CUS-0005', 'DEMOSOLAR', 'Efe Ighodalo', 'SYNCED', now())
on conflict (id) do nothing;

insert into assets (id, assetco_id, customer_id, status, deployed_at, sync_status, last_synced_at) values
  ('GS-1001', 'DEMOSOLAR', 'CUS-0001', 'deployed', now() - interval '4 months', 'SYNCED', now()),
  ('GS-1002', 'DEMOSOLAR', 'CUS-0002', 'deployed', now() - interval '3 months', 'SYNCED', now()),
  ('GS-1003', 'DEMOSOLAR', 'CUS-0003', 'deployed', now() - interval '5 months', 'SYNCED', now()),
  ('GS-1004', 'DEMOSOLAR', 'CUS-0004', 'deployed', now() - interval '2 months', 'SYNCED', now()),
  ('GS-1005', 'DEMOSOLAR', 'CUS-0005', 'deployed', now() - interval '6 months', 'SYNCED', now())
on conflict (id) do nothing;

-- GS-1001: fully current, three payments received
insert into payments (assetco_id, asset_id, customer_id, amount, currency, status, occurred_at) values
  ('DEMOSOLAR', 'GS-1001', 'CUS-0001', 50000, 'NGN', 'received', now() - interval '3 months'),
  ('DEMOSOLAR', 'GS-1001', 'CUS-0001', 50000, 'NGN', 'received', now() - interval '2 months'),
  ('DEMOSOLAR', 'GS-1001', 'CUS-0001', 50000, 'NGN', 'received', now() - interval '1 month');

-- GS-1002: two received, one missed
insert into payments (assetco_id, asset_id, customer_id, amount, currency, status, occurred_at) values
  ('DEMOSOLAR', 'GS-1002', 'CUS-0002', 50000, 'NGN', 'received', now() - interval '2 months'),
  ('DEMOSOLAR', 'GS-1002', 'CUS-0002', 50000, 'NGN', 'received', now() - interval '1 month'),
  ('DEMOSOLAR', 'GS-1002', 'CUS-0002', 50000, 'NGN', 'missed', now() - interval '3 days');

-- GS-1003: one received, then two missed, then defaulted
insert into payments (assetco_id, asset_id, customer_id, amount, currency, status, occurred_at) values
  ('DEMOSOLAR', 'GS-1003', 'CUS-0003', 50000, 'NGN', 'received', now() - interval '4 months'),
  ('DEMOSOLAR', 'GS-1003', 'CUS-0003', 50000, 'NGN', 'missed', now() - interval '2 months'),
  ('DEMOSOLAR', 'GS-1003', 'CUS-0003', 50000, 'NGN', 'missed', now() - interval '1 month'),
  ('DEMOSOLAR', 'GS-1003', 'CUS-0003', 50000, 'NGN', 'defaulted', now() - interval '5 days');

-- GS-1004: fully current, has an open fault
insert into payments (assetco_id, asset_id, customer_id, amount, currency, status, occurred_at) values
  ('DEMOSOLAR', 'GS-1004', 'CUS-0004', 50000, 'NGN', 'received', now() - interval '2 months'),
  ('DEMOSOLAR', 'GS-1004', 'CUS-0004', 50000, 'NGN', 'received', now() - interval '1 month');

-- GS-1005: fully current, had a fault that has since been resolved
insert into payments (assetco_id, asset_id, customer_id, amount, currency, status, occurred_at) values
  ('DEMOSOLAR', 'GS-1005', 'CUS-0005', 50000, 'NGN', 'received', now() - interval '5 months'),
  ('DEMOSOLAR', 'GS-1005', 'CUS-0005', 50000, 'NGN', 'received', now() - interval '4 months');

insert into cashflow_state (asset_id, assetco_id, customer_id, total_collected, outstanding_balance, missed_count, is_defaulted, defaulted_at) values
  ('GS-1001', 'DEMOSOLAR', 'CUS-0001', 150000, 0, 0, false, null),
  ('GS-1002', 'DEMOSOLAR', 'CUS-0002', 100000, 50000, 1, false, null),
  ('GS-1003', 'DEMOSOLAR', 'CUS-0003', 50000, 100000, 2, true, now() - interval '5 days'),
  ('GS-1004', 'DEMOSOLAR', 'CUS-0004', 100000, 0, 0, false, null),
  ('GS-1005', 'DEMOSOLAR', 'CUS-0005', 100000, 0, 0, false, null)
on conflict (asset_id) do update set
  total_collected = excluded.total_collected,
  outstanding_balance = excluded.outstanding_balance,
  missed_count = excluded.missed_count,
  is_defaulted = excluded.is_defaulted,
  defaulted_at = excluded.defaulted_at;

insert into faults (assetco_id, asset_id, status, detected_at, resolved_at, detail) values
  ('DEMOSOLAR', 'GS-1004', 'open', now() - interval '2 days', null, '{"code": "INVERTER_OFFLINE"}'),
  ('DEMOSOLAR', 'GS-1005', 'resolved', now() - interval '3 months', now() - interval '3 months' + interval '6 hours', '{"code": "COMMS_TIMEOUT"}');

insert into alerts (alert_type, assetco_id, asset_id, customer_id, message, sent_at) values
  ('payment.defaulted', 'DEMOSOLAR', 'GS-1003', 'CUS-0003', 'Customer CUS-0003 defaulted on asset GS-1003 (AssetCo: DEMOSOLAR). Amount: 50000 NGN.', now() - interval '5 days'),
  ('asset.fault.detected', 'DEMOSOLAR', 'GS-1004', 'CUS-0004', 'Fault detected on asset GS-1004 (AssetCo: DEMOSOLAR).', now() - interval '2 days')
on conflict do nothing;

insert into sync_state (assetco_id, last_heartbeat_at, last_reconciliation_at, last_reconciliation_status) values
  ('DEMOSOLAR', now() - interval '2 hours', now() - interval '10 hours', 'OK')
on conflict (assetco_id) do update set
  last_heartbeat_at = excluded.last_heartbeat_at,
  last_reconciliation_at = excluded.last_reconciliation_at,
  last_reconciliation_status = excluded.last_reconciliation_status;

-- ============================================================================
-- Section 2: Workstream F — pipeline-stage coverage, DREEF, CEF Series,
-- CEF facilities/repayments, and richer customer/asset variety.
-- ============================================================================

-- DEMOSOLAR backfill: now the mature, fully-monitored AssetCo in the
-- portfolio — funded across two CEF series, DREEF-disbursed, with its own
-- CEF facility and 7 months of repayment history.
update assetcos set
  legal_entity_name = 'DemoSolar Energy Solutions Ltd',
  registration_number = 'RC-1234567',
  website = 'https://demosolar.example.com',
  pipeline_stage = 'PORTFOLIO_MONITORING',
  asset_types = array['Solar Home System', 'Solar Water Pump'],
  customer_types = array['RESIDENTIAL', 'SME'],
  sector = 'SOLAR',
  business_description = 'Pay-as-you-go and lease-to-own solar home systems across Southwest Nigeria.',
  hq_state = 'Lagos',
  operating_states = array['Lagos', 'Ogun', 'Oyo'],
  primary_contact_name = 'Funmi Adisa',
  primary_contact_email = 'funmi@demosolar.example.com',
  integration_type = 'API',
  stage_updated_at = now() - interval '1 month'
where id = 'DEMOSOLAR';

-- Vary deal type / asset type across the existing five DEMOSOLAR assets.
update assets set ownership_model = 'OUTRIGHT_PURCHASE', asset_type = 'Solar Home System' where id = 'GS-1001';
update assets set ownership_model = 'LEASE_TO_OWN', asset_type = 'Solar Home System' where id = 'GS-1002';
update assets set ownership_model = 'LEASE_TO_OWN', asset_type = 'Solar Home System' where id = 'GS-1003';
update assets set ownership_model = 'PAYG_METERED', asset_type = 'Solar Water Pump' where id = 'GS-1004';
update assets set ownership_model = 'PAYG_METERED', asset_type = 'Solar Home System' where id = 'GS-1005';

update customers set status = 'ACTIVE', customer_segment = 'RESIDENTIAL', location_state = 'Lagos', location_lga = 'Ikeja',
  contract_signed_date = now() - interval '4 months', expected_monthly_payment_ngn = 50000, contract_term_months = 24
  where id = 'CUS-0001';
update customers set status = 'IN_ARREARS', customer_segment = 'RESIDENTIAL', location_state = 'Lagos', location_lga = 'Surulere',
  contract_signed_date = now() - interval '3 months', expected_monthly_payment_ngn = 50000, contract_term_months = 24
  where id = 'CUS-0002';
update customers set status = 'DEFAULTED', customer_segment = 'SME', location_state = 'Ogun', location_lga = 'Abeokuta South',
  contract_signed_date = now() - interval '5 months', expected_monthly_payment_ngn = 50000, contract_term_months = 18
  where id = 'CUS-0003';
update customers set status = 'ACTIVE', customer_segment = 'RESIDENTIAL', location_state = 'Oyo', location_lga = 'Ibadan North',
  contract_signed_date = now() - interval '2 months', expected_monthly_payment_ngn = 50000, contract_term_months = 24
  where id = 'CUS-0004';
update customers set status = 'ACTIVE', customer_segment = 'RESIDENTIAL', location_state = 'Lagos', location_lga = 'Epe',
  contract_signed_date = now() - interval '6 months', expected_monthly_payment_ngn = 50000, contract_term_months = 12
  where id = 'CUS-0005';

-- --- GROSOLAR: ONBOARDING stage, DREEF not yet started, no live integration yet ---
insert into assetcos (
  id, name, hmac_secret, is_active, legal_entity_name, registration_number, pipeline_stage,
  asset_types, customer_types, sector, business_description, hq_state, operating_states,
  primary_contact_name, primary_contact_email, integration_type, stage_updated_at
) values (
  'GROSOLAR', 'GroSolar Nigeria Ltd', 'grosolar-secret-change-me', true,
  'GroSolar Nigeria Limited', 'RC-2345678', 'ONBOARDING',
  array['Solar Home System', 'Solar Street Light'], array['RESIDENTIAL', 'COMMERCIAL'], 'SOLAR',
  'Outright-purchase and lease-to-own solar systems for households and small businesses in the North Central region.',
  'Kaduna', array['Kaduna', 'Kano'],
  'Ibrahim Sule', 'ibrahim@grosolar.example.com', 'MANUAL', now() - interval '5 days'
) on conflict (id) do nothing;

insert into customers (id, assetco_id, name, status, customer_segment, location_state, location_lga,
  expected_monthly_payment_ngn, contract_term_months, pipeline_notes, sync_status, data_source) values
  ('CUS-GS-0001', 'GROSOLAR', 'Musa Bello', 'PIPELINE', 'RESIDENTIAL', 'Kaduna', 'Kaduna North', 45000, 24, 'Site survey scheduled.', 'PENDING', 'MANUAL'),
  ('CUS-GS-0002', 'GROSOLAR', 'Amina Yusuf', 'PIPELINE', 'SME', 'Kano', 'Nassarawa', 60000, 18, 'Awaiting credit check.', 'PENDING', 'MANUAL'),
  ('CUS-GS-0003', 'GROSOLAR', 'Danjuma Auta', 'ASSET_ORDERED', 'COMMERCIAL', 'Kaduna', 'Chikun', 80000, 24, 'Unit ordered from OEM, installation TBD.', 'PENDING', 'MANUAL')
on conflict (id) do nothing;

insert into infracredit_relationships (assetco_id, dreef_stage, dreef_notes) values
  ('GROSOLAR', 'NOT_STARTED', 'Too early in CEF onboarding to engage InfraCredit yet.')
on conflict (assetco_id) do nothing;

insert into assetco_stage_log (assetco_id, from_stage, to_stage, changed_by_name, changed_at, notes) values
  ('GROSOLAR', null, 'ONBOARDING', 'System (seed)', now() - interval '5 days', 'Application received and moved into onboarding.')
on conflict do nothing;

-- --- EMLGRID: DUE_DILIGENCE stage, DREEF initial assessment, mini-grid/community customers ---
insert into assetcos (
  id, name, hmac_secret, is_active, legal_entity_name, registration_number, pipeline_stage,
  asset_types, customer_types, sector, business_description, hq_state, operating_states,
  primary_contact_name, primary_contact_email, integration_type, stage_updated_at
) values (
  'EMLGRID', 'EML Mini-Grids Ltd', 'emlgrid-secret-change-me', true,
  'EML Mini-Grids Limited', 'RC-3456789', 'DUE_DILIGENCE',
  array['Mini-Grid Connection', 'Smart Meter'], array['COMMUNITY', 'INSTITUTION'], 'MINI_GRID',
  'Community mini-grid electrification with metered pay-as-you-go billing.',
  'Niger', array['Niger', 'Kwara'],
  'Grace Effiong', 'grace@emlgrid.example.com', 'HYBRID', now() - interval '18 days'
) on conflict (id) do nothing;

insert into customers (id, assetco_id, name, status, customer_segment, location_state, location_lga,
  expected_monthly_payment_ngn, contract_term_months, pipeline_notes, sync_status, data_source) values
  ('CUS-EML-0001', 'EMLGRID', 'Tunga Community Trust', 'PIPELINE', 'COMMUNITY', 'Niger', 'Mokwa', 350000, 60, 'Community-wide metered connection, aggregate billing.', 'PENDING', 'MANUAL'),
  ('CUS-EML-0002', 'EMLGRID', 'Kaiama Health Centre', 'ASSET_ORDERED', 'INSTITUTION', 'Kwara', 'Kaiama', 120000, 36, 'Priority connection — health facility.', 'PENDING', 'MANUAL'),
  ('CUS-EML-0003', 'EMLGRID', 'Rafin Zurfi Market Association', 'PIPELINE', 'COMMUNITY', 'Niger', 'Bida', 200000, 48, 'Awaiting site feasibility report.', 'PENDING', 'MANUAL')
on conflict (id) do nothing;

insert into infracredit_relationships (assetco_id, dreef_stage, dreef_notes, infracredit_contact_name) values
  ('EMLGRID', 'INITIAL_ASSESSMENT', 'InfraCredit reviewing preliminary technical and financial documentation.', 'Chinedu Obi')
on conflict (assetco_id) do nothing;

insert into assetco_stage_log (assetco_id, from_stage, to_stage, changed_by_name, changed_at, notes) values
  ('EMLGRID', 'ONBOARDING', 'DUE_DILIGENCE', 'System (seed)', now() - interval '18 days', 'Onboarding documentation complete, advanced to due diligence.')
on conflict do nothing;

-- --- SSMOBILITY: IC_APPROVAL stage, DREEF mandated, EV battery-swap pilot ---
insert into assetcos (
  id, name, hmac_secret, is_active, legal_entity_name, registration_number, pipeline_stage,
  asset_types, customer_types, sector, business_description, hq_state, operating_states,
  primary_contact_name, primary_contact_email, integration_type, stage_updated_at
) values (
  'SSMOBILITY', 'SSM Mobility Ltd', 'ssmobility-secret-change-me', true,
  'SSM Mobility Limited', 'RC-4567890', 'IC_APPROVAL',
  array['EV Battery Swap Bike', 'Battery Swap Station'], array['SME'], 'EV_MOBILITY',
  'Electric bike battery-swap network for commercial riders in urban centres.',
  'Lagos', array['Lagos'],
  'Tobi Aransiola', 'tobi@ssmobility.example.com', 'API', now() - interval '10 days'
) on conflict (id) do nothing;

insert into customers (id, assetco_id, name, status, customer_segment, location_state, location_lga,
  contract_signed_date, expected_monthly_payment_ngn, contract_term_months, sync_status, data_source) values
  ('CUS-SSM-0001', 'SSMOBILITY', 'Kelechi Obasi', 'ACTIVE', 'SME', 'Lagos', 'Ojo', now() - interval '3 weeks', 30000, 12, 'SYNCED', 'API'),
  ('CUS-SSM-0002', 'SSMOBILITY', 'Fatima Suleiman', 'ASSET_ORDERED', 'SME', 'Lagos', 'Alimosho', null, 30000, 12, 'PENDING', 'API'),
  ('CUS-SSM-0003', 'SSMOBILITY', 'Emeka Chukwu', 'PIPELINE', 'SME', 'Lagos', 'Agege', null, 30000, 12, 'PENDING', 'API')
on conflict (id) do nothing;

insert into assets (id, assetco_id, customer_id, status, deployed_at, ownership_model, asset_type,
  remote_control_supported, oem_model, oem_manufacturer, oem_remote_control_api_available, sync_status) values
  ('SSM-2001', 'SSMOBILITY', 'CUS-SSM-0001', 'deployed', now() - interval '3 weeks', 'PAYG_METERED', 'EV Battery Swap Bike',
   true, 'TankVolt T1', 'TankVolt', true, 'SYNCED')
on conflict (id) do nothing;

insert into cashflow_state (asset_id, assetco_id, customer_id, total_collected, outstanding_balance, missed_count, is_defaulted) values
  ('SSM-2001', 'SSMOBILITY', 'CUS-SSM-0001', 60000, 0, 0, false)
on conflict (asset_id) do nothing;

insert into infracredit_relationships (assetco_id, dreef_stage, dreef_notes, guarantee_type) values
  ('SSMOBILITY', 'MANDATED', 'DREEF mandate letter signed; guarantee structuring in progress.', 'CREDIT_GUARANTEE')
on conflict (assetco_id) do nothing;

insert into assetco_series (assetco_id, series_id, instrument_type, status, notes)
select 'SSMOBILITY', id, 'DEBT', 'CANDIDATE', 'Under consideration for Series C once IC approval clears.'
from cef_series where code = 'SERIES_C'
on conflict (assetco_id, series_id) do nothing;

insert into assetco_stage_log (assetco_id, from_stage, to_stage, changed_by_name, changed_at, notes) values
  ('SSMOBILITY', 'DUE_DILIGENCE', 'IC_APPROVAL', 'System (seed)', now() - interval '10 days', 'Due diligence complete, submitted to Investment Committee.')
on conflict do nothing;

-- --- BRIGHTGRID: DISBURSEMENT stage, DREEF under guarantee, Series B, facility just disbursed ---
insert into assetcos (
  id, name, hmac_secret, is_active, legal_entity_name, registration_number, pipeline_stage,
  asset_types, customer_types, sector, business_description, hq_state, operating_states,
  primary_contact_name, primary_contact_email, integration_type, stage_updated_at
) values (
  'BRIGHTGRID', 'BrightGrid Solar Ltd', 'brightgrid-secret-change-me', true,
  'BrightGrid Solar Limited', 'RC-5678901', 'DISBURSEMENT',
  array['Solar Home System'], array['RESIDENTIAL', 'SME'], 'SOLAR',
  'Lease-to-own and outright-purchase solar systems for peri-urban households.',
  'Ondo', array['Ondo', 'Ekiti'],
  'Yemisi Owolabi', 'yemisi@brightgrid.example.com', 'API', now() - interval '1 month'
) on conflict (id) do nothing;

insert into customers (id, assetco_id, name, status, customer_segment, location_state, location_lga,
  contract_signed_date, expected_monthly_payment_ngn, contract_term_months, sync_status, data_source) values
  ('CUS-BG-0001', 'BRIGHTGRID', 'Kunle Adebayo', 'ACTIVE', 'RESIDENTIAL', 'Ondo', 'Akure South', now() - interval '5 weeks', 55000, 24, 'SYNCED', 'API'),
  ('CUS-BG-0002', 'BRIGHTGRID', 'Titi Fagbenro', 'ACTIVE', 'RESIDENTIAL', 'Ekiti', 'Ado Ekiti', now() - interval '4 weeks', 55000, 24, 'SYNCED', 'API'),
  ('CUS-BG-0003', 'BRIGHTGRID', 'Segun Oladipo', 'INSTALLATION_SCHEDULED', 'SME', 'Ondo', 'Owo', now() - interval '2 weeks', 70000, 18, 'PENDING', 'API')
on conflict (id) do nothing;

insert into assets (id, assetco_id, customer_id, status, deployed_at, ownership_model, asset_type, sync_status) values
  ('BG-3001', 'BRIGHTGRID', 'CUS-BG-0001', 'deployed', now() - interval '5 weeks', 'LEASE_TO_OWN', 'Solar Home System', 'SYNCED'),
  ('BG-3002', 'BRIGHTGRID', 'CUS-BG-0002', 'deployed', now() - interval '4 weeks', 'OUTRIGHT_PURCHASE', 'Solar Home System', 'SYNCED')
on conflict (id) do nothing;

insert into payments (assetco_id, asset_id, customer_id, amount, currency, status, occurred_at) values
  ('BRIGHTGRID', 'BG-3001', 'CUS-BG-0001', 55000, 'NGN', 'received', now() - interval '1 week'),
  ('BRIGHTGRID', 'BG-3002', 'CUS-BG-0002', 55000, 'NGN', 'received', now() - interval '1 week')
on conflict do nothing;

insert into cashflow_state (asset_id, assetco_id, customer_id, total_collected, outstanding_balance, missed_count, is_defaulted) values
  ('BG-3001', 'BRIGHTGRID', 'CUS-BG-0001', 55000, 0, 0, false),
  ('BG-3002', 'BRIGHTGRID', 'CUS-BG-0002', 55000, 0, 0, false)
on conflict (asset_id) do nothing;

insert into infracredit_relationships (assetco_id, dreef_stage, guarantee_type, guarantee_amount_ngn, guarantee_tenor_years, dreef_notes) values
  ('BRIGHTGRID', 'UNDER_GUARANTEE', 'CFBF_CO_FINANCE', 25000000, 5, 'Guarantee in effect, disbursement tranche 1 released.')
on conflict (assetco_id) do nothing;

insert into assetco_series (assetco_id, series_id, disbursement_amount_ngn, disbursement_date, instrument_type, status, notes)
select 'BRIGHTGRID', id, 20000000, now() - interval '1 month', 'DEBT', 'DISBURSED', 'Tranche 1 of Series B facility disbursed.'
from cef_series where code = 'SERIES_B'
on conflict (assetco_id, series_id) do nothing;

insert into assetco_stage_log (assetco_id, from_stage, to_stage, changed_by_name, changed_at, notes) values
  ('BRIGHTGRID', 'IC_APPROVAL', 'DISBURSEMENT', 'System (seed)', now() - interval '1 month', 'IC approved, funds disbursed.')
on conflict do nothing;

insert into infracredit_relationships (assetco_id, dreef_stage, guarantee_type, guarantee_amount_ngn, guarantee_tenor_years, dreef_notes) values
  ('DEMOSOLAR', 'DISBURSED', 'BOTH', 15000000, 5, 'Fully disbursed under DREEF guarantee, portfolio performing.')
on conflict (assetco_id) do nothing;

-- --- DEMOSOLAR series links: funded across both Series A and Series B ---
insert into assetco_series (assetco_id, series_id, disbursement_amount_ngn, disbursement_date, instrument_type, status, notes)
select 'DEMOSOLAR', id, 8000000, now() - interval '10 months', 'DEBT', 'DISBURSED', 'Initial Series A facility, fully deployed.'
from cef_series where code = 'SERIES_A'
on conflict (assetco_id, series_id) do nothing;

insert into assetco_series (assetco_id, series_id, disbursement_amount_ngn, disbursement_date, instrument_type, status, notes)
select 'DEMOSOLAR', id, 15000000, now() - interval '8 months', 'DEBT', 'DISBURSED', 'Follow-on Series B facility for portfolio expansion.'
from cef_series where code = 'SERIES_B'
on conflict (assetco_id, series_id) do nothing;

insert into assetco_stage_log (assetco_id, from_stage, to_stage, changed_by_name, changed_at, notes) values
  ('DEMOSOLAR', 'DISBURSEMENT', 'PORTFOLIO_MONITORING', 'System (seed)', now() - interval '4 months', 'Portfolio stable, moved to ongoing monitoring.')
on conflict do nothing;

-- --- CEF Facility + repayment history for DEMOSOLAR (7 months paid, 1 missed, rest pending) ---
do $$
declare
  demosolar_facility_id uuid;
  brightgrid_facility_id uuid;
  series_a_id uuid;
  series_b_id uuid;
begin
  select id into series_a_id from cef_series where code = 'SERIES_A';
  select id into series_b_id from cef_series where code = 'SERIES_B';

  insert into cef_facilities (
    assetco_id, series_id, facility_reference, facility_type, principal_amount_ngn,
    interest_rate_percent, tenor_months, disbursement_date, maturity_date,
    repayment_frequency, repayment_start_date, scheduled_repayment_amount_ngn, facility_status
  ) values (
    'DEMOSOLAR', series_a_id, 'CEF-FAC-DEMOSOLAR-001', 'LOAN', 15000000,
    12.5, 18, now() - interval '8 months', now() - interval '8 months' + interval '18 months',
    'MONTHLY', now() - interval '7 months', 900000, 'ACTIVE'
  )
  on conflict (facility_reference) do nothing;

  select id into demosolar_facility_id from cef_facilities where facility_reference = 'CEF-FAC-DEMOSOLAR-001';

  insert into cef_facility_schedule (facility_id, due_date, period, principal_due_ngn, interest_due_ngn, status, paid_amount_ngn, paid_date)
  select
    demosolar_facility_id,
    (now() - interval '7 months' + (n || ' months')::interval)::date,
    to_char(now() - interval '7 months' + (n || ' months')::interval, 'YYYY-MM'),
    750000, 150000,
    case when n < 7 then 'PAID' when n = 7 then 'MISSED' else 'PENDING' end,
    case when n < 7 then 900000 else 0 end,
    case when n < 7 then (now() - interval '7 months' + (n || ' months')::interval)::date else null end
  from generate_series(0, 17) as n
  where not exists (select 1 from cef_facility_schedule where facility_id = demosolar_facility_id);

  insert into cef_facility_repayments (facility_id, assetco_id, payment_date, principal_paid_ngn, interest_paid_ngn, payment_reference, payment_type, period_covered, was_on_time, days_late)
  select
    demosolar_facility_id, 'DEMOSOLAR',
    (now() - interval '7 months' + (n || ' months')::interval)::date,
    750000, 150000,
    'PMT-DEMOSOLAR-' || n,
    'SCHEDULED',
    to_char(now() - interval '7 months' + (n || ' months')::interval, 'YYYY-MM'),
    n <> 3,
    case when n = 3 then 4 else 0 end
  from generate_series(0, 6) as n
  where not exists (select 1 from cef_facility_repayments where facility_id = demosolar_facility_id);

  -- BrightGrid: facility just disbursed, first repayment not yet due.
  insert into cef_facilities (
    assetco_id, series_id, facility_reference, facility_type, principal_amount_ngn,
    interest_rate_percent, tenor_months, disbursement_date, maturity_date,
    repayment_frequency, repayment_start_date, scheduled_repayment_amount_ngn, facility_status
  ) values (
    'BRIGHTGRID', series_b_id, 'CEF-FAC-BRIGHTGRID-001', 'LOAN', 20000000,
    13.0, 24, now() - interval '1 month', now() - interval '1 month' + interval '24 months',
    'MONTHLY', now() + interval '2 months', 950000, 'ACTIVE'
  )
  on conflict (facility_reference) do nothing;

  select id into brightgrid_facility_id from cef_facilities where facility_reference = 'CEF-FAC-BRIGHTGRID-001';

  insert into cef_facility_schedule (facility_id, due_date, period, principal_due_ngn, interest_due_ngn, status)
  select
    brightgrid_facility_id,
    (now() + interval '2 months' + (n || ' months')::interval)::date,
    to_char(now() + interval '2 months' + (n || ' months')::interval, 'YYYY-MM'),
    790000, 160000,
    'PENDING'
  from generate_series(0, 23) as n
  where not exists (select 1 from cef_facility_schedule where facility_id = brightgrid_facility_id);
end $$;

-- Facility-related alerts: DEMOSOLAR missed its most recent CEF repayment.
insert into alerts (alert_type, assetco_id, message, sent_at, facility_id)
select 'CEF_FACILITY_REPAYMENT_MISSED', 'DEMOSOLAR',
  'DemoSolar missed its scheduled CEF facility repayment.',
  now() - interval '2 days', id
from cef_facilities where facility_reference = 'CEF-FAC-DEMOSOLAR-001'
on conflict do nothing;

-- --- Audit log entries so the notification feed has real content ---
insert into audit_log (actor_type, actor_assetco_id, action, entity_type, entity_id, details, created_at) values
  ('system', 'GROSOLAR', 'stage_changed', 'assetco', 'GROSOLAR', '{"to_stage": "ONBOARDING"}', now() - interval '5 days'),
  ('system', 'EMLGRID', 'stage_changed', 'assetco', 'EMLGRID', '{"to_stage": "DUE_DILIGENCE"}', now() - interval '18 days'),
  ('system', 'SSMOBILITY', 'stage_changed', 'assetco', 'SSMOBILITY', '{"to_stage": "IC_APPROVAL"}', now() - interval '10 days'),
  ('system', 'BRIGHTGRID', 'stage_changed', 'assetco', 'BRIGHTGRID', '{"to_stage": "DISBURSEMENT"}', now() - interval '1 month'),
  ('system', 'DEMOSOLAR', 'stage_changed', 'assetco', 'DEMOSOLAR', '{"to_stage": "PORTFOLIO_MONITORING"}', now() - interval '4 months'),
  ('system', 'BRIGHTGRID', 'series_linked', 'assetco_series', 'BRIGHTGRID', '{"series": "SERIES_B", "amount_ngn": 20000000}', now() - interval '1 month'),
  ('system', 'DEMOSOLAR', 'series_linked', 'assetco_series', 'DEMOSOLAR', '{"series": "SERIES_A", "amount_ngn": 8000000}', now() - interval '10 months'),
  ('system', 'DEMOSOLAR', 'series_linked', 'assetco_series', 'DEMOSOLAR', '{"series": "SERIES_B", "amount_ngn": 15000000}', now() - interval '8 months'),
  ('system', 'DEMOSOLAR', 'facility_repayment_missed', 'cef_facility', 'CEF-FAC-DEMOSOLAR-001', '{"amount_ngn": 900000}', now() - interval '2 days'),
  ('system', 'SSMOBILITY', 'dreef_updated', 'infracredit_relationship', 'SSMOBILITY', '{"dreef_stage": "MANDATED"}', now() - interval '10 days'),
  ('system', 'BRIGHTGRID', 'dreef_updated', 'infracredit_relationship', 'BRIGHTGRID', '{"dreef_stage": "UNDER_GUARANTEE"}', now() - interval '1 month')
on conflict do nothing;

insert into sync_state (assetco_id, last_heartbeat_at, last_reconciliation_at, last_reconciliation_status) values
  ('SSMOBILITY', now() - interval '1 hour', now() - interval '6 hours', 'OK'),
  ('BRIGHTGRID', now() - interval '3 hours', now() - interval '12 hours', 'OK')
on conflict (assetco_id) do update set
  last_heartbeat_at = excluded.last_heartbeat_at,
  last_reconciliation_at = excluded.last_reconciliation_at,
  last_reconciliation_status = excluded.last_reconciliation_status;
