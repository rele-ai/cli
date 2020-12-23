const {Command, flags} = require('@oclif/command')

class ListCommand extends Command {
  async run() {
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
