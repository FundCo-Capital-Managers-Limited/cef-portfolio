const express = require('express');
const verifySupabaseAuth = require('../middleware/verifySupabaseAuth');
const facilityController = require('../controllers/facilityController');
const facilityComplianceController = require('../controllers/facilityComplianceController');
const facilityMilestoneController = require('../controllers/facilityMilestoneController');

const router = express.Router();

router.use(verifySupabaseAuth);
router.post('/', facilityController.create);
router.get('/repayment-notifications/pending', facilityController.listPendingRepaymentNotifications);
router.get('/:id', facilityController.getOne);
router.patch('/:id', facilityController.update);
router.patch('/:id/status', facilityController.changeStatus);
router.patch('/:id/classification-override', facilityController.setClassificationOverride);
router.delete('/:id/classification-override', facilityController.clearClassificationOverride);
router.post('/:id/repayments', facilityController.recordRepayment);
router.get('/:id/repayments', facilityController.repaymentHistory);

router.post('/:id/repayment-notifications', facilityController.submitRepaymentNotification);
router.get('/:id/repayment-notifications', facilityController.listRepaymentNotifications);
router.post('/repayment-notifications/:notificationId/confirm', facilityController.confirmRepaymentNotification);
router.post('/repayment-notifications/:notificationId/reject', facilityController.rejectRepaymentNotification);

router.post('/:id/documents', facilityComplianceController.addDocument);
router.get('/:id/documents', facilityComplianceController.listDocuments);
router.patch('/documents/:documentId', facilityComplianceController.updateDocument);
router.post('/documents/:documentId/confirm', facilityComplianceController.confirmDocument);

router.post('/:id/security', facilityComplianceController.addSecurity);
router.get('/:id/security', facilityComplianceController.listSecurity);
router.patch('/security/:securityId', facilityComplianceController.updateSecurity);

router.post('/:id/covenants', facilityComplianceController.addCovenant);
router.get('/:id/covenants', facilityComplianceController.listCovenants);
router.patch('/covenants/:covenantId', facilityComplianceController.updateCovenant);

router.post('/:id/milestones', facilityMilestoneController.addMilestone);
router.get('/:id/milestones', facilityMilestoneController.listMilestones);
router.patch('/milestones/:milestoneId', facilityMilestoneController.updateMilestone);

module.exports = router;
