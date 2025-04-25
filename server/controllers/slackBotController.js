
/**
 * Core functionality for the Slack Approval Flow Bot
 */
const { v4: uuidv4 } = require('uuid');
const config = require('../config/index');
const { slack, createApprovalModal, createApprovalRequestBlocks, createNotificationBlocks } = require('../utils/helpers');

/**
 * Handles the slash command to open the approval request modal
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleSlashCommand(req, res) {
  try {
    const { trigger_id } = req.body;

    // Verify this is our command
    if (req.body.command !== config.COMMAND_NAME) {
      return res.status(200).send('Unknown command');
    }

    // Acknowledge the command right away
    res.status(200).send();
    
    // Create and show the modal
    const modal = await createApprovalModal();
    
    await slack.views.open({
      trigger_id,
      view: modal
    });
  } catch (error) {
    console.error('Error handling slash command:', error);
    res.status(500).send('An error occurred');
  }
}

/**
 * Handles the submission of the approval request modal
 * @param {Object} payload - Slack interaction payload
 */
async function handleViewSubmission(payload) {
  try {
    const { user, view } = payload;

    const values = view.state.values;
    const approverId = values[config.BLOCK_IDS.APPROVER_SELECT][config.ACTION_IDS.APPROVER_SELECT].selected_user;
    const approvalText = values[config.BLOCK_IDS.APPROVAL_TEXT][config.ACTION_IDS.APPROVAL_TEXT].value;

    // Generate a unique ID for this request
    const requestId = uuidv4();

    // Get user info
    const requesterInfo = await slack.users.info({ user: user.id });
    const requesterName = requesterInfo.user.real_name || requesterInfo.user.name;

    const blocks = createApprovalRequestBlocks({
      requesterId: user.id,
      requesterName,
      approvalText,
      requestId
    });
 
    // Send the approval request to the approver
    await slack.chat.postMessage({
      channel: approverId,
      blocks,
      text: `${requesterName} has requested your approval`
    });

    // Send a confirmation to the requester
    await slack.chat.postMessage({
      channel: user.id,
      text: `Your approval request has been sent to <@${approverId}>`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Your approval request has been sent to <@${approverId}>. You'll be notified when they respond.`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `>*Your request:*\n>${approvalText}`
          }
        }
      ]
    });

    console.log(`Approval request sent from ${user.id} to ${approverId}`);
  } catch (error) {
    console.error('Error handling view submission:', error);
  }
}

/**
 * Handles approval or rejection button click
 * @param {Object} payload - Slack interaction payload
 */

async function handleButtonAction(payload) {
  try {
    const { user, actions, message } = payload;
    const action = actions[0];
    const isApproved = action.action_id === config.ACTION_IDS.APPROVE_BUTTON;
    
    // Extract data from the button value
    const buttonData = JSON.parse(action.value);
    const { requesterId, approvalText } = buttonData;

    // Update the original message to show the decision
    await slack.chat.update({
      channel: payload.channel.id,
      ts: message.ts,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `Request ${isApproved ? "Approved" : "Rejected"}`,
            emoji: true
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `You have *${isApproved ? "approved" : "rejected"}* the request from <@${requesterId}>.`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `>*Original request:*\n>${approvalText}`
          }
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `${isApproved ? "✅ Approved" : "❌ Rejected"} on ${new Date().toLocaleString()}`
            }
          ]
        }
      ],
      text: `You have ${isApproved ? "approved" : "rejected"} the request`
    });

    // Send notification to the requester
    const notificationBlocks = createNotificationBlocks({
      approverId: user.id, 
      approvalText,
      isApproved
    });

    await slack.chat.postMessage({
      channel: requesterId,
      blocks: notificationBlocks,
      text: `Your request has been ${isApproved ? "approved" : "rejected"} by <@${user.id}>`
    });

    console.log(`Request ${isApproved ? "approved" : "rejected"} by ${user.id} for ${requesterId}`);
  } catch (error) {
    console.error('Error handling button action:', error);
  }
}

module.exports = {
  handleSlashCommand,
  handleViewSubmission,
  handleButtonAction
};
