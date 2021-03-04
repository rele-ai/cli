const cli = require("cli-ux")
const plugin = require("../utils/plugin")
const { flags } = require("@oclif/command")
const { readConfig } = require("../utils/readers")
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
  async _deleteRecord(object) {
    // get clients
    const clients = await this._clients

    // destract version
    const version = await this.version

    // pull client by type
    const client = clients[object.type]

    // get additional conditions
    const conditions = this._getConditionsList(object)

    // check if the config is already exists
    const config = await client.getByKey(object.key, conditions, version)

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

      // delete records and resolve all promises
      await Promise.all(
        data.yamlData.map(async object => {
          return this._deleteRecord(object)
        })
      )

      // stop spinner
      cli.ux.action.stop()
      this.log("All configs from configuration file deleted successfully.")
    } catch (error) {
      cli.ux.action.stop("failed")
      this.error(`Unable to apply configuration file.\n${error}`)
    }
  }
}

DeleteCommand.description = `Delete a set of configurations from RELE.AI App
...
Please read more about the configuration files in the github repository docs.
`

module.exports = DeleteCommand
