const cli = require("cli-ux")
const {Command, flags} = require('@oclif/command')
const BaseCommand = require("../../utils/base-command")
const { AppsClient } = require("../../../lib/components")
const { writeConfig } = require("../../utils/writers")

class GetCommand extends BaseCommand {
  async run() {
    // parse GetCommand
    const { args, flags } = this.parse(GetCommand)

    // destruct args object
    const { key } = args

    // destract flags object
    const { output } = flags

    try {
      // init loader
      cli.ux.action.start(`Pull App by key = ${key}`)

      // resolve access token
      const accessToken = await this.accessToken

      // pull user
      const { user } = await this.user

      // init apps client
      const appsClient = new AppsClient(accessToken.id_token)

      // get app record
      const { apps = [] } = await appsClient.getByKey(key, user.orgs)

      // stop loader
      cli.ux.action.stop()

      // return app record
      // and write to end path.
      if (apps.length) {
        // destract app
        const [app] = apps

        // write output if path provided
        if (output) {
          writeConfig(app, output)
        }

        // return app object
        this.log("App pulled successfuly.")
        return app
      } else return {}
    } catch (error) {
      console.error(error)
      cli.ux.action.stop("falied")
      return
    }
  }
}

GetCommand.description = `Apply a set of configurations to RELE.AI App
...
Please read more about the configuration files in the github repository docs.
`

GetCommand.flags = {
  output: flags.string({
    char: "o",
    description: "A path to output file.",
    required: false
  })
}

GetCommand.args = [
  {
    name: "key",
    required: true,
    description: "Identifier Key."
  }
]

module.exports = GetCommand
