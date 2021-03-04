const BaseCommand = require("../../utils/base-command")

/**
 * Define the deploy user command
 */
class DeployUserCommand extends BaseCommand {
  // disable strict args input
  static strict = false

  /**
   * Returns user's argvs
   */
  getUsersInput() {
    // get the list of users
    const {argv} = this.parse(DeployUserCommand)

    // verify input
    const emailReg = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return Array.from(new Set(argv.map((email) => {
      if (emailReg.test(email)) {
        return email
      }

      throw new Error(`invlaid email format for: ${email}`)
    })))
  }

  /**
   * Load the users that should be updated
   */
  async loadUsers() {
    // get the list of users
    const users = this.getUsersInput()

    // check if the user provided an input - if so, load users
    // otherwise use the user's creds
    if (users.length) {
      this.log(`Using provided args: ${users.join(", ")}`)
    } else {
      this.log(`Using personal id: ${(await this.jwt).userFsId}`)
    }
  }

  /**
   * Execute the command logic
   */
  async run() {
    // load user ids that should be updated
    const users = await this.loadUsers()
  }
}

DeployUserCommand.description = `Deploy your integration and configurations to a user level.
...
Please read more about the deployment process here: https://docs.rele.ai/guide/cli-development.html#rb-deploy
`

module.exports = DeployUserCommand
