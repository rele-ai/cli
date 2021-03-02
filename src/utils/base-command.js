const fs = require("fs")
const os = require("os")
const pkgDir = require("pkg-dir")
const jwtDecode = require("jwt-decode")
const {Command} = require("@oclif/command")
const { UsersClient } = require("../../lib/components")
const AuthClient = require("../../lib/auth")

// pull the homr dir
const HOME = os.homedir()

/**
* Describe the RELE.AI base command
* with additional default attributes that
* are relevant to every command in the system
*/
class BaseCommand extends Command {
  // define global vars
  static RB_DIR = `${HOME}/.rb`
  static TEMPLATE_DIR = `${this.RB_DIR}/.rb-templates`
  static CREDS_PATH = `${this.RB_DIR}/creds.json`
  static CONSOLE_PATH = process.env.NODE_ENV === "development"
    ? "https://console.dev.bot.rele.ai"
    : "https://console.rele.ai"

  /**
  * Extend the default init function
  */
  async init() {
    // parse flags and args
    this._parseFlagsArgs()
  }

  /**
   * Returns updated access token
   */
  get accessToken() {
    return (new AuthClient()).exchangeRefreshForAccess(this.refreshToken)
  }

  /**
   * Return parse JWT object
   */
  get jwt() {
    return this.accessToken
      .then(token => {
        return jwtDecode(token.id_token)
      })
      .catch(e => {
        this.error("unable to get access token when parsing JWT", e)
        return {}
      })
  }

  /**
   * Returns the refresht token from the creds path
   */
  get refreshToken() {
    // check if creds file exists
    if (fs.existsSync(BaseCommand.CREDS_PATH)) {
      return (JSON.parse(fs.readFileSync(BaseCommand.CREDS_PATH).toString("utf-8")) || {}).refresh_token || ""
    }

    return ""
  }

  /**
   * Load user from components service
   */
  get user() {
    return this.jwt
      .then(async decodeJwt => {
        const accessToken = await this.accessToken
        return (new UsersClient(accessToken)).getById(decodeJwt.userFsId)
      })
      .then((response) => {
        return response.user
      })
  }

  /**
   * Returns the package version
   */
  get pkgVersion() {
    return require(`${pkgDir.sync(__dirname)}/package.json`).version
  }


  /**
   * Parse default flags and args
   * into this
   */
  _parseFlagsArgs() {
    // get flags and args
    const { flags, args } = this.parse(this.constructor)

    // set to this
    this.flags = flags
    this.args = args
  }
}

module.exports = BaseCommand
