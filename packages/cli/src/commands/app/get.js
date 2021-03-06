const cli = require("cli-ux")
const {flags} = require("@oclif/command")
const { docListToObj } = require("../../utils")
const { docToConf } = require("../../utils/parser")
const { writeConfig } = require("../../utils/writers")
const BaseCommand = require("../../utils/base-command")
const { debugError } = require("../../../lib/utils/logger")
const { AppsClient, VersionsClient, CONF_KEYS_MAP } = require("../../../lib/components")

/**
 * Get a specific app by the selector key.
 */
class GetCommand extends BaseCommand {
  // command flags
  static flags = {
    // append base command flags
    ...BaseCommand.flags,

    output: flags.string({
      char: "o",
      description: "A path to output file.",
      required: false
    }),
  }

  // command arguments
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
    return [
      // load versions data
      (new VersionsClient(accessToken)).list(),
    ]
  }

  /**
   * Filter apps by matching versions.
   *
   * @param {Array.<object>} apps - List of applications.
   * @param {Array.<string>} versions - List of version IDs.
   */
  filterApps(apps, versions) {
    if (versions) {
      if (versions.constructor !== Array) {
        versions = [versions]
      }

      // filter
      return apps.filter((app) => versions.includes(app.version))
    } else {
      throw new Error("couldn't find matching versions")
    }
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
      cli.ux.action.start(`Pulling application ${key}`)

      // resolve access token
      const accessToken = await this.accessToken

      // init apps client
      const appsClient = new AppsClient(accessToken)

      // load selectors data
      const [versions, apps] = await Promise.all([
        ...this.loadSelectorsData(accessToken),
        appsClient.list([
          [CONF_KEYS_MAP["apps"], "==", key]
        ])
      ])

      // check if any app founded
      if (!(apps || []).length) {
        throw new Error(`can't find and app with key equals to ${key}`)
      }

      // get app record
      const filteredApps = this.filterApps(apps, await this.versions)

      // check yaml config
      if (filteredApps && filteredApps.length) {
        const metadata = {
          versions: docListToObj(versions)
        }

        // convert to yaml
        const appConf = filteredApps.map((app) => docToConf("app", app, metadata)).join("---\n")

        // write output if path provided
        if (output) {
          writeConfig(appConf, output)
        } else {
          // return app object
          this.log(appConf)
        }

        // stop spinner
        cli.ux.action.stop()
      } else {
        cli.ux.action.stop(`couldn't find app for key: ${key}`)
      }
    } catch (error) {
      debugError(error)
      cli.ux.action.stop("falied")
      this.error(`Unable to get application ${key}.\n${error}`)
    }
  }
}

GetCommand.description = `Get an application by the app selector key.
...
Additional information about the app:get command can be found at https://docs.rele.ai/guide/cli-config.html#rb-app-get
`

module.exports = GetCommand
