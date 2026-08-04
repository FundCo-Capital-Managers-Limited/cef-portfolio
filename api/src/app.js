const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const healthRoutes = require('./routes/health');
const eventsRoutes = require('./routes/events');
const mockAssetcoRoutes = require('./routes/mockAssetco');
const reconciliationRoutes = require('./routes/reconciliation');
const notificationsRoutes = require('./routes/notifications');
const assetcosRoutes = require('./routes/assetcos');
const seriesRoutes = require('./routes/series');
const customersRoutes = require('./routes/customers');
const manualRoutes = require('./routes/manual');
const facilitiesRoutes = require('./routes/facilities');
const portfolioRoutes = require('./routes/portfolio');
const usersRoutes = require('./routes/users');
const applicationsRoutes = require('./routes/applications');
const authRoutes = require('./routes/auth');
const sandboxRoutes = require('./routes/sandbox');
const flagsRoutes = require('./routes/flags');
const approvalsRoutes = require('./routes/approvals');
const icMattersRoutes = require('./routes/icMatters');
const icDocumentsRoutes = require('./routes/icDocuments');
const icMeetingsRoutes = require('./routes/icMeetings');
const icCommitteeRoutes = require('./routes/icCommittee');
const icConditionsRoutes = require('./routes/icConditions');
const icEmailRoutes = require('./routes/icEmail');
const errorHandler = require('./middleware/errorHandler');
const env = require('./config/env');
const logger = require('./utils/logger');

const app = express();

if (env.nodeEnv === 'production' && env.corsAllowedOrigins.length === 0) {
  logger.warn('CORS_ALLOWED_ORIGINS is not set in production — the API will accept browser requests from any origin.');
}

const corsOptions = env.corsAllowedOrigins.length
  ? {
      origin(origin, callback) {
        // No Origin header means a non-browser caller (AssetCo webhook,
        // server-to-server, curl) — CORS doesn't apply to those, only to
        // browser fetches, so always allow.
        if (!origin || env.corsAllowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
    }
  : undefined;

app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan(process.env.NODE_ENV === 'test' ? 'silent' : 'dev', {
  skip: () => process.env.NODE_ENV === 'test',
}));

// Capture the raw request body so HMAC verification signs the exact bytes sent,
// not a re-serialized copy (whitespace/key-order differences would break the signature).
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
}));

app.use('/health', healthRoutes);
app.use('/api/v1/events', eventsRoutes);
app.use('/mock-assetco', mockAssetcoRoutes);
app.use('/internal/reconciliation', reconciliationRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/assetcos', assetcosRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/manual', manualRoutes);
app.use('/api/facilities', facilitiesRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/v1/sandbox', sandboxRoutes);
app.use('/api/flags', flagsRoutes);
app.use('/api/approvals', approvalsRoutes);
app.use('/api/ic/matters', icMattersRoutes);
app.use('/api/ic/documents', icDocumentsRoutes);
app.use('/api/ic/meetings', icMeetingsRoutes);
app.use('/api/ic/committee', icCommitteeRoutes);
app.use('/api/ic/conditions', icConditionsRoutes);
app.use('/api/ic/email', icEmailRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

module.exports = app;
