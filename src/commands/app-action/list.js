const cli = require("cli-ux")
const { flags } = require("@oclif/command")
const { docListToObj } = require("../../utils")
const { docToConf } = require("../../utils/parser")
const BaseCommand = require("../../utils/base-command")
const { AppsClient, AppActionsClient } = require("../../../lib/components")

/**
 * List all global and org releated app actions.
 */
class ListCommand extends BaseCommand {
  // command flags
  static flags = {
    // filter by app key
    appKey: flags.string({
      char: "a",
      description: "Filter by an application key",
    })
  }

  /**
   * Load all selectors data
   */
  loadSelectorsData(user, accessToken) {
    // load apps data
    return [
      (new AppsClient(user, accessToken)).list()
    ]
  }

  /**
   * Find application based on given system key.
   *
   * @param {Array.<object>} apps - List of apps.
   * @param {string} key - App system key.
   */
  getAppSystemKey(apps, key) {
    return apps.find(app => app.system_key === key)
  }

  /**
   * Execute the list app actions command
   */
  async run() {
    // start spinner
    cli.ux.action.start("Pulling app actions")

    // try to pull apps
    try {
      // resolve access token and user info
      const [accessToken, { user }] = await Promise.all([this.accessToken, this.user])

      // load selectors data
      const [apps] = await Promise.all(this.loadSelectorsData(user, accessToken))

      // init app actions client
      const client = new AppActionsClient(user, accessToken)

      // build conditions
      const conds = this.flags.appKey ? [["app_id", "==", this.getAppSystemKey(apps, this.flags.appKey).id]] : []

      // list app actions records
      const appActions = await client.list(conds)

      // check results
      if (appActions && appActions.length) {
        // return app records
        const yamlConf = appActions.map((appAction) => docToConf("app_action", appAction, { apps: docListToObj(apps) })).join("---\n")

        // log to user
        this.log(yamlConf)

        // stop spinner
        cli.ux.action.stop()
      } else {
        cli.ux.action.stop("no app actions found")
      }
    } catch(error) {
      console.error(error)
      // handle errors
      cli.ux.action.stop("failed")
      this.error(`unable to list app actions:\n${error}`)
    }
  }
}

ListCommand.description = `List all global and org releated app actions configs.
...
Additional information about the app-action:list command can be found at https://doc.rele.ai/guide/cli-config.html#rb-app-action-list
`

module.exports = ListCommand
