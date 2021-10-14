const fs = require("fs")
const glob = require("glob")
const cli = require("cli-ux")
const yaml = require("js-yaml")
const pkgDir = require("pkg-dir")
const { confToDoc } = require("../../utils/parser")
const { debugError } = require("../../../lib/utils/logger")
const { AppsClient, VersionsClient, CONF_KEYS_MAP } = require("../../../lib/components")
const BaseCommand = require("../../utils/base-command")

/**
 * App tokens by selector key
 */
class TokensCommand extends BaseCommand {
  // command flags
  static flags = {
    // append base command flags
    ...BaseCommand.flags,
  }

  init() {
    super.init()

    // additional pkg locations
    this._pkgLocation = pkgDir.sync(process.cwd())
  }

  /**
   * Get versions list
   */
  async _getVersions() {
    // destract version
    let versions = await this.versions
    if (versions) {
      if (versions.constructor !== Array) {
        versions = [versions]
      }
    } else {
      throw new Error("couldn't find matching versions")
    }

    return versions
  }

  /**
   * Collect version id
   */
  async _collectVersionId() {
    // resolve access token and user info
    const accessToken = await this.accessToken

    // package version
    const packageVersion = require(`${pkgDir.sync(__dirname)}/package.json`).version

    // define version
    const versionNumber = (await this.version) || packageVersion

    // version client
    const client = new VersionsClient(accessToken)

    // check if exists
    let versionId = await client.getVersionId(versionNumber, true, true, false)

    if (versionId && versionId.constructor === Array) {
      versionId = (versionId.find((v) => v.org !== "global") || {}).id
    }

    if (!versionId) {
      // create version
      const versionRes = await client.create(
        {
          key: versionNumber
        }
      )

      // replace to new version id
      versionId = versionRes.id
    }

    // return the version id
    return versionId
  }

  /**
   * generateAppHash generate an app hash string
   */
  async generateAppHash(appsConfigs, versionId) {
    // resolve access token and user info
    const accessToken = await this.accessToken

    // init client
    const client = new AppsClient(accessToken)

    // collect app hash promises
    const promises = appsConfigs.map(async conf => {
      // check if the config is already exists
      const configs = ((await client.list([
        [CONF_KEYS_MAP["apps"], "==", conf.key]
      ])) || []).filter((conf) => conf.version === versionId)

      if (configs.length > 1) {
        throw new Error(`found duplicated ${conf.type}. please contact support@rele.ai`)
      }

      // pull app and check if exists
      const [config] = configs

      if (config) {
        // add to app hash list
        return {
          id: config.id,
          appHash: (await client.getAppHash({ id: config.id })).app_hash,
          appKey: config.system_key
        }
      } else {
        // create app
        const appRes = await client.create(
          confToDoc("App", conf, { client }),
          versionId
        )

        // add to app hash list
        return {
          id: appRes.id,
          appHash: (await client.getAppHash(appRes)).app_hash,
          appKey: conf.key
        }
      }
    })

    // resolve promises
    return (await Promise.all(promises))
  }

  /**
   * Read all apps configs
   */
  async readAppsConfigs() {
    // get configs location
    const configLocation = `${this._pkgLocation}/configs`

    // check if configs directory exists
    if (fs.existsSync(configLocation) && fs.lstatSync(configLocation).isDirectory()) {
      let appsConfs = []

      // load files
      glob
        .sync(`${configLocation}/**/*.yaml`)
        .forEach((yamlLocation) => {
          const file = fs.readFileSync(yamlLocation, "utf-8")
          yaml.loadAll(file).forEach((conf) => {
            if (conf.type === "App") {
              appsConfs.push(conf)
            }
          })
        })

      return appsConfs
    } else {
      throw new Error("`$PROJECT_ROOT/config` directory must exists and contain the YAML configs")
    }
  }

  /**
   * Execute the list apps command
   */
  async run() {
    try {
      // start spinner
      cli.ux.action.start("Generate App Hashes...")

      // validate version id
      const versionId = await this._collectVersionId()

      // read apps configs
      const appsConfigs = await this.readAppsConfigs()

      // generate App Hash
      const appHashes = await this.generateAppHash(appsConfigs, versionId)

      // log app hashes
      this.log(
        appHashes
          .map(app => `APP key: ${app.appKey} \nAPP_ID: ${app.id} \nAPP_HASH: ${app.appHash} \n`)
          .join("---\n")
      )
      // close spinner
      cli.ux.action.stop()
      return appHashes
    } catch (error) {
      debugError(error)
      cli.ux.action.stop("failed")
      this.error(`Unable to generate app hashes.\n${error}`)
    }
  }
}

TokensCommand.description = `Generate APP_ID and APP_HASH tokens.
...
Additional information about the app:tokens command can be found at https://docs.rele.ai/guide/cli-config.html#rb-app-tokens
`

module.exports = TokensCommand
