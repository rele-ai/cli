const cli = require("cli-ux")
const { flags } = require("@oclif/command")
const { docListToObj } = require("../../utils")
const { docToConf } = require("../../utils/parser")
const { writeConfig } = require("../../utils/writers")
const BaseCommand = require("../../utils/base-command")
const { AppsClient, AppActionsClient, VersionsClient, CONF_KEYS_MAP } = require("../../../lib/components")

/**
 * Get a specific user by the selector key.
 */
class GetCommand extends BaseCommand {
  // command flags
  static flags = {
    // append base command flags
    ...BaseCommand.flags,

    // write to output path
    output: flags.string({
      char: "o",
      description: "A path to output file.",
      required: false
    }),

    // filter by app key
    appKey: flags.string({
      char: "a",
      description: "Filter by an application key",
      required: true
    })
  }

  // command arguments
  static args = [
    {
      name: "key",
      required: true,
      description: "App action selector key."
    }
  ]

  /**
   * Load all selectors data
   */
  loadSelectorsData(accessToken) {
    // load apps data
    return [
      // load apps data
      (new AppsClient(accessToken)).list(),

      // load versions data
      (new VersionsClient(accessToken)).list(),
    ]
  }

  /**
   * Pull application from list by key.
   *
   * @param {Array.<object>} apps - List of apps.
   * @param {string} key - App system key.
   */
  async getAppSystemKey(apps, key) {
    let vids = await this.versions

    if (vids) {
      if (vids.constructor !== Array) {
        vids = [vids]
      }


      return apps.filter(app => app.system_key === key && vids.includes(app.version)).map((a) => a.id)
    } else {
      throw new Error("couldn't find matching verions")
    }
  }

  /**
   * Filter relevant app actions based on app Ids.
   *
   * @param {Array.<object>} appActions - App Actions list
   * @param {Array.<string>} appIds - List of app actions IDs.
   */
  filterAppActions(appActions, appIds) {
    return appActions.filter((ac) => appIds.includes(ac.app_id))
  }

  /**
   * Run the get command that loads the application
   */
  async run() {
    // destruct args object
    const { key } = this.args

    // destract flags object
    const { output } = this.flags

    // try to pull app
    try {
      // init loader
      cli.ux.action.start(`Pulling app action ${key}`)

      // resolve access token
      const accessToken = await this.accessToken

      // init app actions client
      const client = new AppActionsClient(accessToken)

      // load selectors data
      const [apps, versions, appActions] = await Promise.all([
        ...this.loadSelectorsData(accessToken),
        client.list([
          [CONF_KEYS_MAP["app_actions"], "==", key]
        ])
      ])

      // get matching appKey
      const appIds = await this.getAppSystemKey(apps, this.flags.appKey)
      const filteredAppActions = this.filterAppActions(appActions, appIds)

      // check response
      if (filteredAppActions && filteredAppActions.length) {
        const metadata = {
          apps: docListToObj(apps),
          versions: docListToObj(versions)
        }

        // convert to yaml
        const yamlConf = filteredAppActions.map((ac) => docToConf(
          "app_action",
          ac,
          metadata
        )).join("---\n")

        // write output if path provided
        if (output) {
          writeConfig(yamlConf, output)
        } else {
          // return app action object
          this.log(yamlConf)
        }

        // stop spinner
        cli.ux.action.stop()
      } else {
        cli.ux.action.stop(`couldn't find app action for key: ${key}`)
      }
    } catch (error) {
      cli.ux.action.stop("falied")
      this.error(`Unable to get app action ${key}.\n${error}`)
    }
  }
}

GetCommand.description = `Get an app action by the app action selector key.
...
Additional information about the app-action:get command can be found at https://doc.rele.ai/guide/cli-config.html#rb-app-action-get
`

module.exports = GetCommand
