const fs = require("fs")
const os = require("os")
const pkgDir = require("pkg-dir")
const jwtDecode = require("jwt-decode")
const AuthClient = require("../../lib/auth")
const { Command, flags } = require("@oclif/command")
const versionSort = require("../../lib/utils/version-sort")
const { UsersClient, VersionsClient } = require("../../lib/components")

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


  // define global flags
  static flags = {
    // get config version from user
    version: flags.string({
      char: "v",
      description: "Config version"
    }),
  }

  /**
  * Extend the default init function
  */
  init() {
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
  get version() {
    // prioritize user args
    if (this.flags.version) {
      return Promise.resolve(this.flags.version)
    }

    // get version from closes package.json
    const pkg = pkgDir.sync(process.cwd())

    if (pkg) {
      return Promise.resolve(require(`${pkgDir.sync(process.cwd())}/package.json`).version)
    } else {
      return this.latestVersion.then(version => version.key).then((key) => {
        if (key) {
          return key
        } else {
          throw new Error("Couldn't find package.json version, or latest version. Please provide -v/--version flag with the proper version.")
        }
      })
    }
  }

  /**
   * Returns the version ID from firestore.
   */
  get versionId() {
    return this.accessToken.then((at) => {
      // init client
      const client = new VersionsClient(at)

      // get id by the version number
      return this.version.then((version) => {
        return client.getVersionId(version)
      })
    })
  }

  /**
   * Return the latest version object from firestore.
   */
  get latestVersion() {
    return this.accessToken.then((at) => {
      // init client
      const client = new VersionsClient(at)

      // get id by the version number
      return client.list()
    }).then((versions) => {
      if (versions && versions.length) {
        return versionSort(versions, { nested: "key" })[versions.length - 1]
      }

      return {}
    })
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
