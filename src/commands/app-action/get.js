const cli = require("cli-ux")
const { flags } = require("@oclif/command")
const { docListToObj } = require("../../utils")
const { docToConf } = require("../../utils/parser")
const { writeConfig } = require("../../utils/writers")
const BaseCommand = require("../../utils/base-command")
const { AppsClient, AppActionsClient, VersionsClient } = require("../../../lib/components")

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
  getAppSystemKey(apps, key) {
    return apps.find(app => app.system_key === key)
  }

  /**
   * Run the get command that loads the application
   */
  async run() {
    // destruct args object
    const { key } = this.args

    // destract flags object
    const { output, version } = this.flags

    // try to pull app
    try {
      // init loader
      cli.ux.action.start(`Pulling app action ${key}`)

      // resolve access token
      const accessToken = await this.accessToken

      // load selectors data
      const [apps, versions] = await Promise.all(this.loadSelectorsData(accessToken))

      // init app actions client
      const client = new AppActionsClient(accessToken)

      // get app actions record
      const appAction = await client.getByKey(key, [["app_id", "==", this.getAppSystemKey(apps, this.flags.appKey).id]], true, version)

      // check response
      if (appAction) {
        // convert to yaml
        const yamlConf = docToConf(
          "app_action",
          appAction,
          {
            apps: docListToObj(apps),
            versions: docListToObj(versions)
          }
        )

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
