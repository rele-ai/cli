const BaseCommand = require("../utils/base-command")

/**
 * Log all the integration version.
 */
class VersionsCommand extends BaseCommand {
  /**
   * Execute the versions command
   */
  async run() {
    this.log(`versions`)
  }
}

VersionsCommand.description = `List all user/org related versions.
...
Please read more about the deployment process here: https://docs.rele.ai/guide/cli-development.html#rb-version
`

module.exports = VersionsCommand
