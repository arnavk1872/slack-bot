
/**
 * API routes for the Slack bot
 */
const express = require('express');
const { createHmac, timingSafeEqual } = require('crypto');
const slackBot = require('../controllers/slackBotController');
const config = require('../config/index');

const router = express.Router();

/**
 * Middleware to verify Slack signatures
 * This ensures requests are genuinely coming from Slack
 */
function verifySlackSignature(req, res, next) {

  if (!config.SLACK_SIGNING_SECRET) {
    console.warn('SLACK_SIGNING_SECRET not set. Skipping signature verification.');
    return next();
  }

  
  try {
    const slackSignature = req.headers['x-slack-signature'];
    const timestamp = req.headers['x-slack-request-timestamp'];
    
    // Prevent replay attacks
    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - timestamp) > 60 * 5) {
      return res.status(401).send('Request timestamp too old');
    }
    
    // Convert request body to string if it's not already
    const requestBody = req.rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
    
    // Create signature to compare with the one from Slack
    const sigBasestring = `v0:${timestamp}:${requestBody}`;
    const mySignature = 'v0=' + createHmac('sha256', config.SLACK_SIGNING_SECRET)
      .update(sigBasestring)
      .digest('hex');
    
    // Compare signatures
    if (timingSafeEqual(Buffer.from(mySignature), Buffer.from(slackSignature))) {
      return next();
    } else {
      return res.status(401).send('Invalid signature');
    }
  } catch (error) {
    console.error('Error verifying Slack signature:', error);
    return res.status(401).send('Verification failed');
  }
}

/**
 * Handle slash commands from Slack
 */
router.post('/slack/commands', verifySlackSignature, slackBot.handleSlashCommand);

/**
 * Handle interactive components (buttons, modals)
 */
router.post('/slack/interactions', verifySlackSignature, (req, res) => {
  // Parse the payload
  let payload;
  try {
    payload = JSON.parse(req.body.payload);
  } catch (error) {
    console.error('Error parsing payload:', error);
    return res.status(400).send('Invalid payload');
  }
  
  // Acknowledge receipt of the interaction immediately
  res.status(200).send();
  
  // Handle different types of interactions
  switch (payload.type) {
    case 'view_submission':
      // User submitted the modal
      slackBot.handleViewSubmission(payload);
      break;
      
    case 'block_actions':
      // User clicked a button
      if (payload.actions.length > 0) {
        const actionId = payload.actions[0].action_id;
        
        if (actionId === config.ACTION_IDS.APPROVE_BUTTON || 
            actionId === config.ACTION_IDS.REJECT_BUTTON) {
          slackBot.handleButtonAction(payload);
        }
      }
      break;
      
    default:
      console.log(`Unhandled interaction type: ${payload.type}`);
  }
});

module.exports = router;
