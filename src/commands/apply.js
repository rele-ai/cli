const cli = require("cli-ux")
const { flags } = require("@oclif/command")
const { readConfig } = require("../utils/readers")
const { confToDoc } = require("../utils/parser")
const { CONF_KEYS_MAP } = require("../utils/formatters")
const { toSnakeCase, docListToObj, sortByTypes } = require("../utils/index")
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

  async run() {
    try {
      // start spinner
      cli.ux.action.start("Applying configuration file...")

      // destract path
      const { path } = this.flags

      // resolve access token and user info
      const [accessToken, { user }] = await Promise.all([this.accessToken, this.user])

      // init clients
      let clients = {}
      Object.keys(Clients).forEach(key => {
        clients[key] = new Clients[key](user, accessToken)
      })

      // load selectors data
      const [workflows, apps, appActions] = await Promise.all(this.loadSelectorsData(clients))

      // format yaml to array of objects
      const yamlData = readConfig(path)

      // collect update or create promises
      const prms = sortByTypes(yamlData).map(async object => {
        // pull client by type
        const client = clients[`${object.type}sClient`]

        // define snakeCase config type
        const snakeCaseType = toSnakeCase(object.type)

        // key identifier
        const formattedKey = CONF_KEYS_MAP[`${snakeCaseType}s`]

        // check if the config is already exists
        const config = await client.getByKey(object[formattedKey])

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
          return (await client.updateByKey(object[formattedKey], data))
        } else {
          // create config
          return (await client.create(data))
        }
      })

      // resolve all create/update promises
      await Promise.all(prms)

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
