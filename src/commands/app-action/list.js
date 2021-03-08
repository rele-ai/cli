const cli = require("cli-ux")
const { flags } = require("@oclif/command")
const { docListToObj } = require("../../utils")
const { docToConf } = require("../../utils/parser")
const BaseCommand = require("../../utils/base-command")
const { AppsClient, AppActionsClient, VersionsClient } = require("../../../lib/components")

/**
 * List all global and org releated app actions.
 */
class ListCommand extends BaseCommand {
  // command flags
  static flags = {
    // append base command flags
    ...BaseCommand.flags,

    // filter by app key
    appKey: flags.string({
      char: "a",
      description: "Filter by an application key",
    })
  }

  /**
   * check for version on init
   */
  async init() {
    // parse flags
    super.init()

    // check version
    if (this.flags.appKey) {
      await this.version
    }
  }

  /**
   * Load all selectors data
   */
  loadSelectorsData(accessToken) {
    return [
      // load apps data
      (new AppsClient(accessToken)).list(),

      // load app actions data
      (new AppActionsClient(accessToken)).list(),

      // load versions data
      (new VersionsClient(accessToken)).list(),
    ]
  }

  /**
   * Find application based on given system key.
   *
   * @param {Array.<object>} apps - List of apps.
   * @param {string} key - App system key.
   */
  async getAppSystemKey(apps, key) {
    let vids = await this.versions

    if (vids) {
      if (vids.constructor !== Array) {
        vids = [vids]
      }

      return apps.filter(app => app.system_key === key && vids.includes(app.version)).map((a) => a.id)
    } else {
      throw new Error("couldn't find matching version.")
    }
  }

  /**
   * Execute the list app actions command
   */
  async run() {
    // start spinner
    cli.ux.action.start("Pulling app actions")

    // try to pull apps
    try {
      // resolve access token and user info
      const accessToken = await this.accessToken

      // load selectors data
      let [apps, appActions, versions] = await Promise.all(this.loadSelectorsData(accessToken))

      // check results
      if (appActions && appActions.length) {
        const metadata = {
          apps: docListToObj(apps),
          versions: docListToObj(versions)
        }

        // filter out relevant apps
        if (this.flags.appKey) {
          // get app key
          const appIds = await this.getAppSystemKey(apps, this.flags.appKey)

          // append to conditions if app key exists
          if (appIds && appIds.length) {
            appActions = appActions.filter((ac) => appIds.includes(ac.app_id))
          } else {
            cli.ux.action.stop("no app actions found")
            return
          }
        }

        // return app records
        const yamlConf = appActions.map((appAction) => {
          return docToConf(
            "app_action",
            appAction,
            metadata
          )
        }).join("---\n")

        // log to user
        this.log(yamlConf)

        // stop spinner
        cli.ux.action.stop()
      } else {
        cli.ux.action.stop("no app actions found")
      }
    } catch(error) {
      console.error(error)
      // handle errors
      cli.ux.action.stop("failed")
      this.error(`unable to list app actions:\n${error}`)
    }
  }
}

ListCommand.description = `List all global and org releated app actions configs.
...
Additional information about the app-action:list command can be found at https://doc.rele.ai/guide/cli-config.html#rb-app-action-list
`

module.exports = ListCommand
