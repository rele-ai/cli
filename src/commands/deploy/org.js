const BaseCommand = require("../../utils/base-command")

/**
 * Define the deploy org command
 */
class DeployOrgCommand extends BaseCommand {
  /**
   * Execute the command logic
   */
  async run() {
    this.log("deply org")
  }
}

DeployOrgCommand.description = `Deploy your integration and configurations to an org level.
...
Please read more about the deployment process here: https://docs.rele.ai/guide/cli-development.html#rb-deploy
`

module.exports = DeployOrgCommand
