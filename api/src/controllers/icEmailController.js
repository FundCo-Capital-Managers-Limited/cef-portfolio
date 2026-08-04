const icEmailService = require('../services/icEmailService');

async function send(req, res, next) {
  try {
    const { matterId, toEmails, subject, body } = req.body;
    const email = await icEmailService.sendEmail({ matterId, toEmails, subject, body }, req.user);
    res.status(201).json({ email });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const emails = await icEmailService.listEmails({ matterId: req.query.matterId });
    res.status(200).json({ emails });
  } catch (err) {
    next(err);
  }
}

module.exports = { send, list };
