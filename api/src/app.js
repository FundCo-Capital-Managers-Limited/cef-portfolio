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
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());
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

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

module.exports = app;
