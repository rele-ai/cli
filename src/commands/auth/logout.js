const {Command, flags} = require('@oclif/command')

class LogoutCommand extends Command {
  async run() {
    this.log(`logout`)
  }
}

LogoutCommand.description = `Manage the authorization session to RELE.AI
...
Manage the credentials to access RELE.AI workflows and apps.
`

LogoutCommand.flags = {
  config: flags.string({
    char: "c",
    description: "A path to the configuration file",
    required: true
  })
}

module.exports = LogoutCommand
