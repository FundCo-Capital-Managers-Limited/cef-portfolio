const app = require('./app');
const env = require('./config/env');

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`cef-pip-api listening on port ${env.port} (${env.nodeEnv})`);
});
