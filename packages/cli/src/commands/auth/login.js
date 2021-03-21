const os = require("os")
const fs = require("fs")
const open = require("open")
const cli = require("cli-ux")
const {start} = require("../../../web/index")
const BaseCommand = require("../../utils/base-command")

// login command execution
class LoginCommand extends BaseCommand {
  /**
   * Execute the login command
   */
  async run() {
    if (fs.existsSync(BaseCommand.CREDS_PATH)) {
      // clear old creds
      fs.unlinkSync(BaseCommand.CREDS_PATH)
    }

    // generate random state validation
    const state = Math.floor(Math.random()*90000) + 10000;

    // run the local server
    start({state})

    // define the target url
    const consolePath = `${BaseCommand.CONSOLE_PATH}?state=${state}&redirect_uri=http://localhost:9091/`

    // log info to user
    this.log(`Visit this URL on this device to log in:\n\n${consolePath}\n\n`)

    // open the redirect uri with the default browser
    open(consolePath)

    // start spinner
    cli.ux.action.start("Waiting for authentication...")
  }
}

// command description
LoginCommand.description = `Manage the authorization session to RELE.AI
...
Manage the credentials to access RELE.AI workflows and apps.
`

module.exports = LoginCommand
