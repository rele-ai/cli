const os = require("os")
const fs = require("fs")
const open = require("open")
const cli = require("cli-ux")
const {Command, flags} = require('@oclif/command')

// login command execution
class LoginCommand extends Command {
  async run() {
    // generate random state validation
    const state = Math.floor(Math.random()*90000) + 10000;

    // log info to user
    this.log(`Visit this URL on this device to log in:\n\nhttps://console.rele.ai?state=${state}&redirect_uri=http://localhost:9091/\n\n`)

    // open the redirect uri with the default browser
    open(`https://console.rele.ai?state=${state}&redirect_uri=http://localhost:9091/`)

    cli.action.start("Waiting for authentication...\n")

    // look for the oauth file every second
    const homedir = os.homedir()
    let intervalId = setInterval(() => {
      // check if creds exists and clear interval
      if (fs.existsSync(`${homedir}/.rb/creds.json`)) {
        clearInterval(intervalId)
      }
    }, 1000)
  }
}

// command description
LoginCommand.description = `Manage the authorization session to RELE.AI
...
Manage the credentials to access RELE.AI workflows and apps.
`

// additional command flags
LoginCommand.flags = {}

module.exports = LoginCommand
