const ROLES = ['executive', 'management', 'finance', 'ops', 'it_admin', 'assetco_admin', 'assetco_dev', 'risk', 'board_member'];
// board_member deliberately excluded — they only ever reach IC data (gated
// by can_access_ic/current_user_can_access_ic()), never the broader
// AssetCo/financial read-write access this list implies.
const CEF_WIDE_ROLES = ['executive', 'management', 'finance', 'ops', 'it_admin', 'risk'];

module.exports = { ROLES, CEF_WIDE_ROLES };
