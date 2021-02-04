const {Command, flags} = require('@oclif/command')

class VersionsCommand extends Command {
  async run() {
    const {flags} = this.parse(VersionsCommand)
    const name = flags.name || 'world'
    this.log(`hello ${name} from ./src/commands/hello.js`)
  }
}

VersionsCommand.description = `Describe the command here
...
Extra documentation goes here
`

VersionsCommand.flags = {
  name: flags.string({char: 'n', description: 'name to print'}),
}

module.exports = VersionsCommand
