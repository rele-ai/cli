const fs = require("fs")
const os = require("os")
const path = require("path")
const LoginCommand = require("../auth/login")
const BaseCommand = require("../../utils/base-command")
const e = require("express")
const credsPath = path.join(os.homedir(), ".rb/creds.json")
const  emitter  = require("../../utils/loginEvent")

const printCreds = () => {
  let creds = require(credsPath)
  console.log(`\nSuccess! Use this token to login on a CI server:\n\n${creds.refresh_token}\n\nExample: rb deploy -t ${creds.refresh_token}\n\n`)
}
// login command execution
class LoginCICommand extends BaseCommand {
  /**
   * Execute the login command
   */
async run() {
    try {
      // the emitter handle exit emit when the user is authorized the request in the browser.
      emitter.on('exit',printCreds)

      if (fs.existsSync(credsPath) && require(credsPath).refresh_token) {
        printCreds()
      } else {
        LoginCommand.run([])
      }

    } catch(err) {
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
