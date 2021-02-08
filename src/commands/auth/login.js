const os = require("os")
const fs = require("fs")
const open = require("open")
const cli = require("cli-ux")
const {start} = require("../../../web/index")
const {Command, flags} = require("@oclif/command")

const CREDS_PATH = `${os.homedir()}/.rb/creds.json`
const CONSOLE_PATH = process.env.NODE_ENV === "development"
  ? "https://console.dev.bot.rele.ai"
  : "https://console.rele.ai"

// login command execution
class LoginCommand extends Command {
  /**
   * Execute the login command
   */
  async run() {
    if (fs.existsSync(CREDS_PATH)) {
      // clear old creds
      fs.rmSync(CREDS_PATH)
    }

    // generate random state validation
    const state = Math.floor(Math.random()*90000) + 10000;

    // run the local server
    start({state})

    // define the target url
    const consolePath = `${CONSOLE_PATH}?state=${state}&redirect_uri=http://localhost:9091/`

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
