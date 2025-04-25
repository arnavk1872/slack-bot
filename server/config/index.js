
/**
 * Configuration settings for the Slack bot
 * In a production environment, these should be set as environment variables
 */

module.exports = {

  SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN || "",
  SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET || "",

  PORT: process.env.PORT || 3000,

  COMMAND_NAME: "/approval-test",
  
  BLOCK_IDS: {
    APPROVER_SELECT: "approver_select_block",
    APPROVAL_TEXT: "approval_text_block"
  },
  
  ACTION_IDS: {
    APPROVER_SELECT: "approver_select",
    APPROVAL_TEXT: "approval_text",
    APPROVE_BUTTON: "approve_button",
    REJECT_BUTTON: "reject_button"
  }
};
