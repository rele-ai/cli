const {Command, flags} = require('@oclif/command')

class ApplyCommand extends Command {
  async run() {
    const {flags} = this.parse(ApplyCommand)
    const name = flags.name || 'world'
    this.log(`hello ${name} from ./src/commands/hello.js`)
  }
}

ApplyCommand.description = `Describe the command here
...
Extra documentation goes here
`

ApplyCommand.flags = {
  name: flags.string({char: 'n', description: 'name to print'}),
}

module.exports = ApplyCommand
