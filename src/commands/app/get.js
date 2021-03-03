const cli = require("cli-ux")
const {flags} = require("@oclif/command")
const { docListToObj } = require("../../utils")
const { docToConf } = require("../../utils/parser")
const { writeConfig } = require("../../utils/writers")
const BaseCommand = require("../../utils/base-command")
const { AppsClient, VersionsClient } = require("../../../lib/components")

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
   * Returns the list conditions matrix.
   */
  async getListConditions() {
    // define conditions
    let conds = []

    // get version id
    const vid = await this.versionId

    // query by version
    if (vid) {
      conds.push(["version", "==", vid])
    }

    // return conditions matrix
    return conds
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

      // load selectors data
      const [versions] = await Promise.all(this.loadSelectorsData(accessToken))

      // init apps client
      const appsClient = new AppsClient(accessToken)

      // get conditions list
      const conds  = await this.getListConditions()

      // get app record
      const app = await appsClient.getByKey(key, conds)

      // check yaml config
      if (app) {
        // convert to yaml
        const appConf = docToConf("app", app, { versions: docListToObj(versions) })

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
      cli.ux.action.stop("falied")
      this.error(`Unable to get application ${key}.\n${error}`)
    }
  }
}

GetCommand.description = `Get an application by the app selector key.
...
Additional information about the app:get command can be found at https://doc.rele.ai/guide/cli-config.html#rb-app-get
`

module.exports = GetCommand
