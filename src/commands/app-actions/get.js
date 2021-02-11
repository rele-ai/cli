const cli = require("cli-ux")
const {flags} = require("@oclif/command")
const { writeConfig } = require("../../utils/writers")
const BaseCommand = require("../../utils/base-command")
const { AppsClient } = require("../../../lib/components")
const { docToConf } = require("../../utils/parser")

/**
 * Get a specific user by the selector key.
 */
class GetCommand extends BaseCommand {
  // command flags
  static flags = {
    output: flags.string({
      char: "o",
      description: "A path to output file.",
      required: false
    })
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
      const [accessToken, { user }] = await Promise.all([this.accessToken, this.user])

      // init apps client
      const appsClient = new AppsClient(user, accessToken)

      // get app record
      const app = await appsClient.getByKey(key)

      // convert to yaml
      const appConf = docToConf("app", app)

      // write output if path provided
      if (output) {
        writeConfig(appConf, output)
      } else {
        // return app object
        this.log(appConf)
      }

      // stop spinner
      cli.ux.action.stop()
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
