const fs = require("fs")
const cli = require("cli-ux")
const BaseCommand = require("../../utils/base-command")

/**
 * Define the logout command that revokes and removes the access token
 */
class LogoutCommand extends BaseCommand {
  /**
   * Execute the logout CLI command
   */
  async run() {
    // start revoking process
    cli.ux.action.start("Revoking access")

    // remove creds
    if (fs.existsSync(BaseCommand.CREDS_PATH)) {
      fs.rmSync(BaseCommand.CREDS_PATH)
    }

    // stop spinner
    cli.ux.action.stop()
  }
}

LogoutCommand.description = `Manage the authorization session to RELE.AI
...
Revoke the CLI creds.
`

module.exports = LogoutCommand
