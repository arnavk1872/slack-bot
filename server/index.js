/**
 * Main server file for the Slack Approval Flow Bot
 */
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const routes = require('./routes/slackRoutes');
const config = require('./config/index');

const app = express();

const rawBodySaver = function (req, res, buf) {
  if (buf && buf.length) {
    req.rawBody = buf.toString('utf8');
  }
};

app.use(bodyParser.urlencoded({ extended: true, verify: rawBodySaver }));
app.use(bodyParser.json({ verify: rawBodySaver }));


app.use('/', routes);

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.PORT, () => {
    console.log(`Slack Approval Flow Bot server running on port ${config.PORT}`);

    if (!config.SLACK_BOT_TOKEN) {
      console.warn('\x1b[33m%s\x1b[0m', 'Warning: SLACK_BOT_TOKEN not set. The bot will not be able to communicate with Slack.');
    }

    if (!config.SLACK_SIGNING_SECRET) {
      console.warn('\x1b[33m%s\x1b[0m', 'Warning: SLACK_SIGNING_SECRET not set. Request signature verification is disabled.');
    }

    console.log('\x1b[36m%s\x1b[0m', 'Server startup complete! Ready to handle Slack interactions.');
  });
}

module.exports = app; 