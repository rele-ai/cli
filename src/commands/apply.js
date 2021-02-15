const cli = require("cli-ux")
const { flags } = require("@oclif/command")
const { readConfig } = require("../utils/readers")
const { confToDoc } = require("../utils/parser")
const { CONF_KEYS_MAP } = require("../utils/formatters")
const { toSnakeCase, docListToObj, stagesByTypes } = require("../utils/index")
const BaseCommand = require("../utils/base-command")
const {WorkflowsClient, AppsClient, TranslationsClient, AppActionsClient} = require("../../lib/components")

class ApplyCommand extends BaseCommand {
  // command flags
  static flags = {
    path: flags.string({
      char: "f",
      description: "A path to source yaml file.",
      required: false
    })
  }

  /**
   * Load all selectors data
   */
  async loadSelectorsData() {
    const clients = await this._clients

    // return selector data
    return [
      // load workflow data
      clients.Workflow.list(),

      // load apps data
      clients.App.list(),

      // load app actions data
      clients.AppAction.list(),
    ]
  }

  /**
   * generate config record on firestore.
   */
  async _generateRecord(object) {
    // get clients
    const clients = await this._clients

    // load selectors data
    const [workflows, apps, appActions] = await Promise.all(await this.loadSelectorsData())

    // pull client by type
    const client = clients[object.type]

    // check if the config is already exists
    const config = await client.getByKey(object.key)

    // define the data object
    const data = {
      [toSnakeCase(object.type)]: confToDoc(
        object.type,
        object,
        {
          workflows: docListToObj(workflows),
          apps: docListToObj(apps),
          appActions: docListToObj(appActions),
        }
      )
    }

    if (config) {
      // update config
      return client.updateByKey(object.key, data)
    } else {
      // create config
      return client.create(data)
    }
  }

  /**
   * Init clients
   */
  async _initClients() {
    // resolve access token and user info
    const [accessToken, { user }] = await Promise.all([this.accessToken, this.user])

    // return clients
    return {
      Workflow: new WorkflowsClient(user, accessToken),
      App: new AppsClient(user, accessToken),
      Translation: new TranslationsClient(user, accessToken),
      AppAction: new AppActionsClient(user, accessToken)
    }
  }

  async run() {
    try {
      // start spinner
      cli.ux.action.start("Applying configuration file...")

      // collect init clients promises
      this._clients = this._initClients()

      // destract path
      const { path } = this.flags

      // format yaml to array of objects
      const yamlData = readConfig(path)
      // const docs = yamlData.map(toDoc)

      // destract stages
      const [firstStage = [], secondStage = []] = stagesByTypes(yamlData)

      // collect first stage promises
      await Promise.all(
        firstStage.map(async object => {
          return this._generateRecord(object)
        })
      )

      // collect second stage promises
      await Promise.all(
        secondStage.map(async object => {
          return this._generateRecord(object)
        })
      )

      // stop spinner
      cli.ux.action.stop()
      this.log("Configuration file applied successfully.")
    } catch (error) {
      cli.ux.action.stop("failed")
      this.error(`Unable to apply configuration file.\n${error}`)
    }
  }
}

ApplyCommand.description = `Apply a set of configurations to RELE.AI App
...
Please read more about the configuration files in the github repository docs.
`

module.exports = ApplyCommand
