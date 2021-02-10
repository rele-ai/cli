const {Command, flags} = require('@oclif/command')
const BaseCommand = require("../../utils/base-command")

class ListCommand extends BaseCommand {
  async run() {
    // new client(this.accessToken.id_token)...
    // client.list()
    this.log(`list`)
  }
}

ListCommand.description = `Apply a set of configurations to RELE.AI App
...
Please read more about the configuration files in the github repository docs.
`

ListCommand.flags = {
  config: flags.string({
    char: "c",
    description: "A path to the configuration file",
    required: true
  })
}

module.exports = ListCommand
