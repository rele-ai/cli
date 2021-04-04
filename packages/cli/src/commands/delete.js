const cli = require("cli-ux")
const plugin = require("../utils/plugin")
const { flags } = require("@oclif/command")
const { readConfig } = require("../utils/readers")
const { debugError } = require("../../lib/utils/logger")
const BaseCommand = require("../utils/base-command")
const {
  WorkflowsClient,
  AppsClient,
  TranslationsClient,
  AppActionsClient,
  OperationsClient
} = require("../../lib/components")

class DeleteCommand extends BaseCommand {
  // command flags
  static flags = {
    // append base command flags
    ...BaseCommand.flags,

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
   * _getConditionsList checks if extra conditions
   * for getByKey request are nessesary.
   */
  _getConditionsList(object) {
    // defines conditions list
    let conditions = []

    // checks if extra conditions
    // needed
    switch (object.type) {
    case "Translation":
      conditions.push(["lang", "==", object.lang])
      break
    default:
      break
    }

    // return extra conditions
    return conditions
  }

  /**
   * generate config record on firestore.
   */
  async _deleteRecord(object, metadata) {
    // get clients
    const clients = await this._clients

    // add workflows to metadata
    metadata = {
      ...metadata,
      object
    }

    // pull client by type
    const client = clients[object.type]

    // get additional conditions
    const conditions = this._getConditionsList(object)

    // check if the config is already exists
    const config = await client.getByKey(object.key, conditions, metadata)

    if (config) {
      // update config
      return client.deleteById(config.id)
    } else {
      // config is not founded
      if (!object.key.startsWith("__rb_internal")) {
        this.log(`Deletion not completed for ${object.key}, no ${object.type} found with key = ${object.key}`)
      }
      return
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
      cli.ux.action.start("Delete configs from configuration file...")

      // collect init clients promises
      this._clients = this._initClients()

      // destract path
      const { path } = this.flags

      // load selectors data
      const [workflows] = await Promise.all(await this.loadSelectorsData())

      // format yaml to array of objects
      const data = { yamlData: readConfig(path) }

      // execute on delete
      await plugin.delete._execute(
        "load",
        data,
        {
          accessToken: await this.accessToken
        }
      )

      // build metadata
      const metadata = {
        version: await this.version,
        removeGlobal: true,
        workflows
      }

      // delete records and resolve all promises
      await Promise.all(
        data.yamlData.map(async object => {
          return this._deleteRecord(object, metadata)
        })
      )

      // stop spinner
      cli.ux.action.stop()
      this.log("All configs from configuration file deleted successfully.")
    } catch (error) {
      debugError(error)
      cli.ux.action.stop("failed")
      this.error(`Unable to delete configuration file.\n${error}`)
    }
  }
}

DeleteCommand.description = `Delete a set of configurations from RELE.AI App
...
Please read more about the configuration files in the github repository docs.
`

module.exports = DeleteCommand
