const cli = require("cli-ux")
const { flags } = require("@oclif/command")
const { readConfig } = require("../utils/readers")
const { confToDoc } = require("../utils/parser")
const { CONF_KEYS_MAP } = require("../utils/formatters")
const { toSnakeCase, docListToObj, stagesByTypes } = require("../utils/index")
const BaseCommand = require("../utils/base-command")
const Clients = require("../../lib/components")

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
  loadSelectorsData(clients) {
    return [
      // load workflow data
      clients["WorkflowsClient"].list(),

      // load apps data
      clients["AppsClient"].list(),

      // load app actions data
      clients["AppActionsClient"].list(),
    ]
  }

  /**
   * generate config record on firestore.
   */
  async _generateRecord(object) {
    // resolve access token and user info
    const [accessToken, { user }] = await Promise.all([this.accessToken, this.user])

    // init clients
    let clients = {}
    Object.keys(Clients).forEach(key => {
      clients[key] = new Clients[key](user, accessToken)
    })

    // load selectors data
    const [workflows, apps, appActions] = await Promise.all(this.loadSelectorsData(clients))

    // pull client by type
    const client = clients[`${object.type}sClient`]

    // define snakeCase config type
    const snakeCaseType = toSnakeCase(object.type)

    // check if the config is already exists
    const config = await client.getByKey(object.key)

    // define the data object
    const data = {
      [snakeCaseType]: confToDoc(
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

  async run() {
    try {
      // start spinner
      cli.ux.action.start("Applying configuration file...")

      // destract path
      const { path } = this.flags

      // format yaml to array of objects
      const yamlData = readConfig(path)

      // destract stages
      const [firstStage = [], secondStage = []] = stagesByTypes(yamlData)

      // collect first stage promises
      const firstStagePrm = firstStage.map(async object => {
        return this._generateRecord(object)
      })

      // resolve first stage promises
      await Promise.all(firstStagePrm)

      // collect second stage promises
      const secondStagePrm = secondStage.map(async object => {
        return this._generateRecord(object)
      })

      // resolve first stage promises
      await Promise.all(secondStagePrm)

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
