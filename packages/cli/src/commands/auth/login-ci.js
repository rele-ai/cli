const fs = require("fs")
const os = require("os")
const path = require("path")
const LoginCommand = require("../auth/login")
const BaseCommand = require("../../utils/base-command")
const e = require("express")
const credsPath = path.join(os.homedir(), ".rb/creds.json")
const  emitter  = require("../../utils/loginEvent")

const printCreds = (refresh_token) => {
  if(!refresh_token)
    refresh_token = require(credsPath).refresh_token
  console.log(`\nSuccess! Use this token to login on a CI server:\n\n${refresh_token}\n\nExample: rb deploy -t ${refresh_token}\n\n`)
}
// login command execution
class LoginCICommand extends BaseCommand {
  /**
   * Execute the login command
   */
async run() {
      // the emitter handle exit emit when the user is authorized the request in the browser.
      emitter.on('exit',printCreds)
      let refresh_token
      if (fs.existsSync(credsPath) && (refresh_token = require(credsPath)?.refresh_token)) {
        printCreds(refresh_token)
      } else {
        LoginCommand.run([])
      }
    }
}
// command description
LoginCICommand.description = `Manage the authorization session to RELE.AI
...
Manage the credentials to access RELE.AI workflows and apps.
`

module.exports = LoginCICommand
