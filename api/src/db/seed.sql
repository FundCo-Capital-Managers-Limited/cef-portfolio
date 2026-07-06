-- Demo/dev seed data for the DEV Supabase project only. Never run against prod.
--
-- Populates a single fictional AssetCo (DEMOSOLAR) with five assets covering
-- the states the dashboard needs to show: current, one missed payment,
-- one defaulted, one with an open fault, one with a resolved fault. This is
-- the same data shape the DemoSolar test harness (Week 5) will generate
-- programmatically via real events — this file exists purely so the
-- dashboard has something to display before that harness exists.

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
  ('asset.fault.detected', 'DEMOSOLAR', 'GS-1004', 'CUS-0004', 'Fault detected on asset GS-1004 (AssetCo: DEMOSOLAR).', now() - interval '2 days');

insert into sync_state (assetco_id, last_heartbeat_at, last_reconciliation_at, last_reconciliation_status) values
  ('DEMOSOLAR', now() - interval '2 hours', now() - interval '10 hours', 'OK')
on conflict (assetco_id) do update set
  last_heartbeat_at = excluded.last_heartbeat_at,
  last_reconciliation_at = excluded.last_reconciliation_at,
  last_reconciliation_status = excluded.last_reconciliation_status;
