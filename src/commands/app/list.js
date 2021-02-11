const cli = require("cli-ux")
const { docToConf } = require("../../utils/parser")
const BaseCommand = require("../../utils/base-command")
const { AppsClient } = require("../../../lib/components")

/**
 * List all global and org releated apps.
 */
class ListCommand extends BaseCommand {
  /**
   * Execute the list apps command
   */
  async run() {
    // start spinner
    cli.ux.action.start("Pulling apps")

    // try to pull apps
    try {
      // resolve access token and user info
      const [accessToken, { user }] = await Promise.all([this.accessToken, this.user])

      // init apps client
      const appsClient = new AppsClient(user, accessToken)

      // apps records
      const apps = await appsClient.list()

      // return app records
      const yamlConf = apps.map((app) => docToConf("app", app)).join("---\n")

      // log to user
      this.log(yamlConf)

      // stop spinner
      cli.ux.action.stop()
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
