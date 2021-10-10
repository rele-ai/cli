const fs = require("fs")
const os = require("os")
const open = require("open")
const path = require("path")
const cli = require("cli-ux")
const {start} = require("../../../web/index")
const BaseCommand = require("../../utils/base-command")
const credsPath = path.join(os.homedir(), ".rb")

// login command execution
class LoginCICommand extends BaseCommand {
  /**
   * Execute the login command
   */
  async run() {
    // generate random state validation
    const state = Math.floor(Math.random()*90000) + 10000;

    // run the local server
    start({state})

    // define the target url
    const consolePath = `${BaseCommand.CONSOLE_PATH}?state=${state}&redirect_uri=http://localhost:9091/`

    // log info to user
    this.log(`Visit this URL on this device to log in:\n\n${consolePath}\n\n`)

    // start spinner
    cli.ux.action.start("Waiting for authentication...")
    // open the redirect uri with the default browser
    open(consolePath);

    process.on('exit', ( code ,signal) => {
      if(code == 0){
          const tokens = JSON.parse(fs.readFileSync(path.join(credsPath, "creds.json"),'utf8'))
          if(tokens)
            console.log(`\nSuccess! Use this token to login on a CI server:\n\n${tokens.refresh_token}\n\nExample: rb deploy -t ${tokens.refresh_token}\n\n`)
          }
    })
  }
}

// command description
LoginCICommand.description = `Manage the authorization session to RELE.AI
...
Manage the credentials to access RELE.AI workflows and apps.
`

module.exports = LoginCICommand
