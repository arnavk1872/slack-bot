
/**
 * Utility functions for the Slack bot
 */
const { WebClient } = require('@slack/web-api');
const config = require('../config/index');

const slack = new WebClient(config.SLACK_BOT_TOKEN);

/**
 * Fetches the list of users in the workspace
 * @returns {Promise<Array>} Array of user objects
 */
async function fetchUsers() {
  try {
    const result = await slack.users.list();
    // Filter out bots, slackbot, and deactivated users
    return result.members.filter(
      user => !user.is_bot && 
              user.name !== 'slackbot' && 
              !user.deleted
    );
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

/**
 * Creates a modal for requesting approval
 * @returns {Object} Modal view object
 */
async function createApprovalModal() {
  // Fetch users for the dropdown
  const users = await fetchUsers();
  
  const userOptions = users.map(user => ({
    text: {
      type: "plain_text",
      text: user.real_name || user.name
    },
    value: user.id
  }));

  return {
    type: "modal",
    title: {
      type: "plain_text",
      text: "Request Approval"
    },
    submit: {
      type: "plain_text",
      text: "Submit"
    },
    close: {
      type: "plain_text",
      text: "Cancel"
    },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Select a user to request approval from:"
        }
      },
      {
        type: "input",
        block_id: config.BLOCK_IDS.APPROVER_SELECT,
        label: {
          type: "plain_text",
          text: "Approver"
        },
        element: {
          type: "users_select",
          action_id: config.ACTION_IDS.APPROVER_SELECT,
          placeholder: {
            type: "plain_text",
            text: "Select an approver"
          }
        }
      },
      {
        type: "input",
        block_id: config.BLOCK_IDS.APPROVAL_TEXT,
        label: {
          type: "plain_text",
          text: "What do you need approval for?"
        },
        element: {
          type: "plain_text_input",
          action_id: config.ACTION_IDS.APPROVAL_TEXT,
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "Provide details about your request..."
          }
        }
      }
    ]
  };
}

/**
 * Creates an approval request message
 * @param {Object} params - Parameters for the approval request
 * @param {string} params.requesterId - ID of the requester
 * @param {string} params.requesterName - Name of the requester
 * @param {string} params.approvalText - Text of the approval request
 * @param {string} params.requestId - Unique ID for the request
 * @returns {Array} Blocks for the approval request message
 */
function createApprovalRequestBlocks({ requesterId, requesterName, approvalText, requestId }) {
  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "Approval Request",
        emoji: true
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*<@${requesterId}>* has requested your approval:`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `>${approvalText}`
      }
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Approve",
            emoji: true
          },
          style: "primary",
          action_id: config.ACTION_IDS.APPROVE_BUTTON,
          value: JSON.stringify({
            requestId,
            requesterId,
            approvalText
          })
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Reject",
            emoji: true
          },
          style: "danger",
          action_id: config.ACTION_IDS.REJECT_BUTTON,
          value: JSON.stringify({
            requestId,
            requesterId,
            approvalText
          })
        }
      ]
    }
  ];
}

/**
 * Creates a notification message for the requester
 * @param {Object} params - Parameters for the notification
 * @param {string} params.approverId - ID of the approver
 * @param {string} params.approverName - Name of the approver
 * @param {string} params.approvalText - Text of the approval request
 * @param {boolean} params.isApproved - Whether the request was approved
 * @returns {Array} Blocks for the notification message
 */
function createNotificationBlocks({ approverId, approvalText, isApproved }) {
  const status = isApproved ? "✅ Approved" : "❌ Rejected";
  const statusColor = isApproved ? "good" : "danger";

  return [
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
        text: `Your approval request has been *${isApproved ? "approved" : "rejected"}* by <@${approverId}>.`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `>*Original request:*\n>${approvalText}`
      }
    }
  ];
}

module.exports = {
  slack,
  fetchUsers,
  createApprovalModal,
  createApprovalRequestBlocks,
  createNotificationBlocks
};
