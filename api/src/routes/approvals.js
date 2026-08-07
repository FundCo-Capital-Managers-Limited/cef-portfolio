const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const { requireRole, CEF_WIDE_ROLES } = require('../middleware/requireRole');
const approvalController = require('../controllers/approvalController');

const router = express.Router();

router.use(verifySupabaseAuth);
router.use(requireRole(...CEF_WIDE_ROLES));

router.get('/', approvalController.list);
router.get('/report', approvalController.report);
router.get('/report/export', approvalController.exportReportCsv);
router.post('/:id/approve', approvalController.approve);
router.post('/:id/reject', approvalController.reject);

module.exports = router;
