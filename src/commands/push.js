const {Command, flags} = require('@oclif/command')

class PushCommand extends Command {
  async run() {
    const {flags} = this.parse(PushCommand)
    const name = flags.name || 'world'
    this.log(`hello ${name} from ./src/commands/hello.js`)
  }
}

PushCommand.description = `Describe the command here
...
Extra documentation goes here
`

PushCommand.flags = {
  name: flags.string({char: 'n', description: 'name to print'}),
}

module.exports = PushCommand
