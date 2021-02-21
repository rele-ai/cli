const cli = require("cli-ux")
const { flags } = require("@oclif/command")
const { readConfig } = require("../utils/readers")
const { confToDoc } = require("../utils/parser")
const { toSnakeCase, docListToObj, stagesByTypes } = require("../utils/index")
const BaseCommand = require("../utils/base-command")
const {
  WorkflowsClient,
  AppsClient,
  TranslationsClient,
  AppActionsClient,
  OperationsClient
} = require("../../lib/components")

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
    const clients = await this._initClients()

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
   * _formatConfToDoc takes an object in YAML
   * format and convert it to JSON.
   */
  async _formatConfToDoc(object) {
    // load selectors data
    const [workflows, apps, appActions] = await Promise.all(await this.loadSelectorsData())

    // define the data object
    return confToDoc(
      object.type,
      object,
      {
        workflows: docListToObj(workflows),
        apps: docListToObj(apps),
        appActions: docListToObj(appActions),
      }
    )
  }

  /**
   * generate operations records on firestore.
   */
  async _generateOperations(operationsConfs) {
    // define clients
    const clients = await this._clients

    // format operations confs to
    // operations docs
    const operationsDocs = await Promise.all(
      operationsConfs.map(conf => this._formatConfToDoc(conf))
    )

    // create operations records
    await clients.Operation.createRecords(operationsDocs)
  }

  /**
   * generate config record on firestore.
   */
  async _generateRecord(object) {
    // get clients
    const clients = await this._clients

    // pull client by type
    const client = clients[object.type]

    // format conf to doc
    const data = await this._formatConfToDoc(object)

    // check if the config is already exists
    const config = await client.getByKey(object.key)

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
    const accessToken = await this.accessToken

    // return clients
    return {
      Workflow: new WorkflowsClient(accessToken),
      App: new AppsClient(accessToken),
      Translation: new TranslationsClient(accessToken),
      AppAction: new AppActionsClient(accessToken),
      Operation: new OperationsClient(accessToken),
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
      let [firstStage = [], secondStage = [], thirdStage = []] = stagesByTypes(yamlData)

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

      // collect third stage promises
      await this._generateOperations(thirdStage)

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
