const cli = require("cli-ux")
const { docToConf } = require("../../utils/parser")
const { AppsClient } = require("../../../lib/components")
const BaseCommand = require("../../utils/base-command")

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
      const appsClient = new AppsClient(accessToken.id_token)

      // apps records
      const { apps } = await appsClient.list(user.orgs)

      // return app records
      const yamlConf = apps.map((app) => docToConf("app", app)).join("\n---\n")

      // log to user
      this.log(yamlConf)
    } catch(error) {
      // handle errors
      cli.ux.action.stop("failed")
      this.error(`unable to list apps:\n${error}`)
    }
  }
}

ListCommand.description = `List all global and org releated app configs.
...
Please read more about the configuration files in the github repository docs.
`

module.exports = ListCommand
