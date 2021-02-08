const os = require("os")
const fs = require("fs")
const path = require("path")
const open = require("open")
const cli = require("cli-ux")
const {start} = require("../../../web/index")
const childProcess = require("child_process")
const {Command, flags} = require('@oclif/command')

const CREDS_PATH = `${os.homedir()}/.rb/creds.json`
const CONSOLE_PATH = process.env.NODE_ENV === "development"
  ? "https://console.dev.bot.rele.ai"
  : "https://console.rele.ai"

// login command execution
class LoginCommand extends Command {
  /**
   * Starts the auth server
   */
  runServer() {
    this._app = start()
  }

  /**
   * Close the auth server
   */
  closeServer() {
    if (this._serverProcess) {
      this._serverProcess.kill()
    }
  }

  async run() {
    if (fs.existsSync(CREDS_PATH)) {
      // clear old creds
      fs.rmSync(CREDS_PATH)
    }

    // run the local server
    this.runServer()

    // generate random state validation
    const state = Math.floor(Math.random()*90000) + 10000;

    // log info to user
    this.log(`Visit this URL on this device to log in:\n\n${CONSOLE_PATH}?state=${state}&redirect_uri=http://localhost:9091/\n\n`)

    // open the redirect uri with the default browser
    open(`${CONSOLE_PATH}?state=${state}&redirect_uri=http://localhost:9091/`)

    cli.ux.action.start("Waiting for authentication...")

    // look for the oauth file every second
    let intervalId = setInterval(() => {
      // check if creds exists and clear interval
      if (fs.existsSync(CREDS_PATH)) {
        // clear inerval
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

module.exports = LoginCommand
