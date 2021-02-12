const cli = require("cli-ux")
const BaseCommand = require("../../utils/base-command")
const { AppsClient } = require("../../../lib/components")

/**
 * Delete an application from RELE.AI. Only applications
 * that are related to the user's organization can be deleted.
 */
class DeleteCommand extends BaseCommand {
  // define the command arguments
  static args = [
    {
      name: "key",
      required: true,
      description: "App selector key."
    }
  ]

  /**
   * Execute the delete command
   */
  async run() {
    // destruct the key from the arguments
    const { key } = this.args

    // start cli spinner
    cli.ux.action.start(`Deleting application ${key}`)

    // try to delete the application
    try {
      // resolve access token and user
      const [accessToken, { user }] = await Promise.all([this.accessToken, this.user])

      // init apps client
      const client = new AppsClient(user, accessToken)

      // delete application by key
      await client.deleteByKey(key)

      // stop spinner
      cli.ux.action.stop()
    } catch (err) {
      cli.ux.action.stop("failed")
      this.error(`Unable to delete application ${key}.\n${err}`)
    }
  }
}

DeleteCommand.description = `Delete an application from RELE.AI by the application key.
...
Additional information about the app:delete command can be found at https://doc.rele.ai/guide/cli-config.html#rb-app-delete
`

module.exports = DeleteCommand
