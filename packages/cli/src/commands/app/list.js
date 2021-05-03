const cli = require("cli-ux")
const { flags } = require("@oclif/command")
const { docListToObj } = require("../../utils")
const { docToConf } = require("../../utils/parser")
const { writeConfig } = require("../../utils/writers")
const BaseCommand = require("../../utils/base-command")
const { debugError } = require("../../../lib/utils/logger")
const { AppsClient, VersionsClient } = require("../../../lib/components")

/**
 * List all global and org releated apps.
 */
class ListCommand extends BaseCommand {
  static flags = {
    // append base command flags
    ...BaseCommand.flags,

    // output file path
    output: flags.string({
      char: "o",
      description: "A path to output file."
    })
  }

  /**
   * Load all selectors data
   */
  loadSelectorsData(accessToken) {
    return [
      // load versions data
      (new VersionsClient(accessToken)).list()
    ]
  }

  /**
   * Execute the list apps command
   */
  async run() {
    // start spinner
    cli.ux.action.start("Pulling apps")

    // try to pull apps
    try {
      // destract output flag
      const { output } = this.flags

      // resolve access token
      const accessToken = await this.accessToken

      // load selectors data
      const [versions] = await Promise.all(this.loadSelectorsData(accessToken))

      // init apps client
      const appsClient = new AppsClient(accessToken)

      // apps records
      const apps = await appsClient.list()

      // check results
      if (apps && apps.length) {
        const metadata = {
          versions: docListToObj(versions)
        }

        // return app records
        const yamlConf = apps.map((app) => {
          return docToConf(
            "app",
            app,
            metadata
          )
        }).join("---\n")

        // write configs to file
        if (output) {
          writeConfig(yamlConf, output)
        }

        // log to user
        this.log(yamlConf)

        // stop spinner
        cli.ux.action.stop()
      } else {
        cli.ux.action.stop("no apps found")
      }
    } catch(error) {
      // handle errors
      debugError(error)
      cli.ux.action.stop("failed")
      this.error(`unable to list apps:\n${error}`)
    }
  }
}

ListCommand.description = `List all global and org releated app configs.
...
Additional information about the app:list command can be found at https://docs.rele.ai/guide/cli-config.html#rb-app-tokens
`

module.exports = ListCommand
