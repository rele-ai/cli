const cli = require("cli-ux")
const { AppsClient } = require("../../../lib/components")
const {Command, flags} = require('@oclif/command')
const BaseCommand = require("../../utils/base-command")
const { flatten } = require("../../utils/formatters")

class ListCommand extends BaseCommand {
  async run() {
    cli.ux.action.start("Pull Apps")

    try {
      // resolve access token
      const accessToken = await this.accessToken

      const { user } = await this.user

      // init apps client
      const appsClient = new AppsClient(accessToken.id_token)

      // set conditions array
      const conditions = [
        this._toBytes(["org", "==", "global"]),
        this._toBytes(["org", "==", user.orgs[0]])
      ]

      // collect promises apps list with "or" condition of org_id
      const promises = conditions.map(async cond => {
        const { apps = [] } = await appsClient.list([cond])
        return apps
      })

      // resolve app list promises
      const appsRecords = flatten(await Promise.all(promises))
      this.log("Apps pulled successfuly.")

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
