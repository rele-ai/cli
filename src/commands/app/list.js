const cli = require("cli-ux")
const { docToConf } = require("../../utils/parser")
const { docListToObj } = require("../../utils")
const BaseCommand = require("../../utils/base-command")
const { AppsClient, VersionsClient } = require("../../../lib/components")

/**
 * List all global and org releated apps.
 */
class ListCommand extends BaseCommand {
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
        // return app records
        const yamlConf = apps.map((app) => {
          return docToConf(
            "app",
            app,
            {
              versions: docListToObj(versions)
            }
          )
        }).join("---\n")

        // log to user
        this.log(yamlConf)

        // stop spinner
        cli.ux.action.stop()
      } else {
        cli.ux.action.stop("no apps found")
      }
    } catch(error) {
      console.error(error)
      // handle errors
      cli.ux.action.stop("failed")
      this.error(`unable to list apps:\n${error}`)
    }
  }
}

ListCommand.description = `List all global and org releated app configs.
...
Additional information about the app:list command can be found at https://doc.rele.ai/guide/cli-config.html#rb-app-list
`

module.exports = ListCommand
