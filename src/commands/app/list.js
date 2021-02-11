const cli = require("cli-ux")
const { docToConf } = require("../../utils/parser")
const { AppsClient } = require("../../../lib/components")
const BaseCommand = require("../../utils/base-command")

class ListCommand extends BaseCommand {
  async run() {
    cli.ux.action.start("Pulling apps")

    try {
      // resolve access token
      const accessToken = await this.accessToken

      // parse user information
      const { user } = await this.user

      // init apps client
      const appsClient = new AppsClient(accessToken.id_token)

      // apps records
      const { apps } = await appsClient.list(user.orgs)

      // return app records
      this.log(docToConf("app", apps))
    } catch(error) {
      cli.ux.action.stop("failed")
      this.error("unable to list apps", error)
    }
  }
}

ListCommand.description = `Apply a set of configurations to RELE.AI App
...
Please read more about the configuration files in the github repository docs.
`

module.exports = ListCommand
