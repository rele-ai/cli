const {Command, flags} = require('@oclif/command')

class CreateCommand extends Command {
  async run() {
    this.log(`Create Integration`)
  }
}

CreateCommand.description = `Create a set of configurations to RELE.AI App
...
Please read more about the configuration files in the github repository docs.
`

CreateCommand.flags = {}

module.exports = CreateCommand
