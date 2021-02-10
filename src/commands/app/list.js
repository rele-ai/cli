const cli = require("cli-ux")
const { AppsClient } = require("../../../lib/components")
const {Command, flags} = require('@oclif/command')
const BaseCommand = require("../../utils/base-command")

class ListCommand extends BaseCommand {
  async run() {
    cli.ux.action.start("Pull Apps")

    try {
      // resolve access token
      const accessToken = await this.accessToken

      const { user } = await this.user

      // init apps client
      const appsClient = new AppsClient(accessToken.id_token)

      // apps records
      const appsRecords = await appsClient.list(user.orgs)

      this.log("Apps pulled successfuly.")

      // return app records
      return appsRecords
    } catch(error) {
      console.error(error)
      cli.ux.action.stop("failed")
      this.error("unable to list apps")
      return
    }
  }
}

ListCommand.description = `Apply a set of configurations to RELE.AI App
...
Please read more about the configuration files in the github repository docs.
`

module.exports = ListCommand
