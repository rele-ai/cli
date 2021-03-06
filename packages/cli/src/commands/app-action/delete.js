const cli = require("cli-ux")
const { flags } = require("@oclif/command")
const BaseCommand = require("../../utils/base-command")
const { AppsClient, AppActionsClient } = require("../../../lib/components")
const { debugError } = require("../../../lib/utils/logger")

/**
 * Delete an app action from RELE.AI. Only app actions
 * that are related to the user's organization can be deleted.
 */
class DeleteCommand extends BaseCommand {
  // command flags
  static flags = {
    // append base command flags
    ...BaseCommand.flags,

    // filter by app key
    appKey: flags.string({
      char: "a",
      description: "Filter by an application key",
      required: true
    })
  }

  // define the command arguments
  static args = [
    {
      name: "key",
      required: true,
      description: "App selector key."
    }
  ]

  /**
   * Load all selectors data
   */
  loadSelectorsData(accessToken) {
    // load apps data
    return [
      (new AppsClient(accessToken)).list()
    ]
  }

  /**
   * Pull application from list by key.
   *
   * @param {Array.<object>} apps - List of apps.
   * @param {string} key - App system key.
   */
  async getAppSystemKey(apps, key) {
    const vid = await this.versionId

    return apps.find(app => app.system_key === key && app.version === vid)
  }

  /**
   * Execute the delete command
   */
  async run() {
    // destruct the key from the arguments
    const { key } = this.args

    // start cli spinner
    cli.ux.action.start(`Deleting app action ${key}`)

    // try to delete the app action
    try {
      // resolve access token
      const accessToken = await this.accessToken

      // load selectors data
      const [apps] = await Promise.all(this.loadSelectorsData(accessToken))

      // init apps client
      const client = new AppActionsClient(accessToken)

      // get app key
      const appKey = await this.getAppSystemKey(apps, this.flags.appKey)

      // check that we found an app
      if (!appKey) {
        cli.ux.action.stop("couldn't find matching app actions")
        return
      }

      // delete app action by key
      await client.deleteByKey(key, [["app_id", "==", appKey.id]])

      // stop spinner
      cli.ux.action.stop()
    } catch (err) {
      debugError(err)
      cli.ux.action.stop("failed")
      this.error(`Unable to delete app action ${key}.\n${err}`)
    }
  }
}

DeleteCommand.description = `Delete an application from RELE.AI by the application key.
...
Additional information about the app-action:delete command can be found at https://docs.rele.ai/guide/cli-config.html#rb-app-action-delete
`

module.exports = DeleteCommand
