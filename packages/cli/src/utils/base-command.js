const fs = require("fs")
const os = require("os")
const npm = require("npm")
const path = require("path")
const pkgDir = require("pkg-dir")
const inquirer = require("inquirer")
const jwtDecode = require("jwt-decode")
const Metalsmith = require("metalsmith")
const AuthClient = require("../../lib/auth")
const { compareVersions } = require("./index")
const latestVersion = require("latest-version")
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
  async init() {
    // validate rele.ai version
    await this._validateCliVersion()

    // parse flags and args
    this._parseFlagsArgs()
  }

  /**
   * Returns updated access token
   */
  get accessToken() {
    // define auth client
    const authClient = new AuthClient()

    return (new Promise((resolve, reject) => {
      // validate existing access token
      authClient.notify("validate_access_token", { accessToken: this._accessToken })
        .then(res => {
          resolve({ id_token: res.access_token, access_token: res.access_token })
        })
        .catch(_ => {
          // exchange refresh token for new access token
          // in case of invalid access token
          authClient.notify("exchange_refresh_token", { refreshToken: this.refreshToken })
            .then(token => {
              // re-write new access token and current refresh token
              fs.writeFileSync(BaseCommand.CREDS_PATH, JSON.stringify({ access_token: token.access_token, refresh_token: token.refresh_token }))

              // resolve promise
              // with new refresh token and access token
              resolve(token)
            })
            .catch(err => reject(err))
        })
    }))
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
        console.error(e)
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
   * Returns the access token from the creds path
   */
  get _accessToken() {
    // check if creds file exists
    if (fs.existsSync(BaseCommand.CREDS_PATH)) {
      return (JSON.parse(fs.readFileSync(BaseCommand.CREDS_PATH).toString("utf-8")) || {}).access_token || ""
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
      return Promise.resolve(require(`${pkg}/package.json`).version)
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
   * Return list of matching versions
   */
  get versions() {
    return this.accessToken.then((at) => {
      // init client
      const client = new VersionsClient(at)

      // get id by the version number
      return this.version.then((version) => {
        return client.getVersionId(version, false, true)
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

  /**
   * askUpgrade ask the user if he wants to
   * update releai/cli version
   *
   * @param {string} currVer - current version
   * @param {string} lsVer - latest version
   */
  async askUpgrade(currVer, lsVer) {
    return new Promise((resolve, reject) => {
      inquirer.prompt([{
        type: "rawlist",
        name: "isUpgrade",
        message: `You are using @releai/cli version ${currVer}.\nWe have found an updated version of @releai/cli - ${lsVer}\nWould you like to upgrade?`,
        default: false,
        choices: ["Yes", "No"],
      }]).then(answers => {
        resolve(answers)
      })
    })
  }

  /**
   * _asyncExec takes a command
   *  and execute it
   *
   * @param {*} path
   */
   async _asyncExec(command) {
      const { exec } = require("child_process")

      // execute command
      return new Promise((resolve, reject) => {
        exec(command, (err, stdout, stderr) => {
          if (err) reject(err)
          if (stderr) reject (err)
          resolve(stdout)
        })
      })
   }

  /**
   * _upgradeReleaiCli upgrade releaicli
   * to latest version
   */
   async _upgradeReleaiCli(path) {
   }

  /**
   * _validateCliVersion checks rele.ai version
   * and ask for upgrade if there is any older version
   * avaliable on npm
   */
  async _validateCliVersion() {
    // get latest version from npm
    const lsVer = await latestVersion("@releai/cli")

    // get current version installed
    const path = pkgDir.sync(__dirname)
    const pkg = require(`${path}/package.json`)
    const currVer = pkg.version

    if (compareVersions(currVer, lsVer)) {
      // ask user for upgrade releai version
      const { isUpgrade } = await this.askUpgrade(currVer, lsVer)

      // check if need to upgrade
      // releai version
      if (isUpgrade === "Yes") {
        await this._upgradeReleaiCli(path)
      }
    }
  }
}

module.exports = BaseCommand
