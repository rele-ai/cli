const { readConfig } = require("../utils/readers")
const { confToDoc } = require("../utils/parser")
const { toSnakeCase } = require("../utils/index")
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

  async run() {
    // destract path
    const { path } = this.flags

    // resolve access token and user info
    const [accessToken, { user }] = await Promise.all([this.accessToken, this.user])

    // init clients
    let clients = {}
    Object.keys(Clients).forEach(key => {
      clients[key] = new Clients[key](user, accessToken)
    })

    // format yaml to array of objects
    const yamlData = readConfig(path)

    // collect update or create promises
    const prms = yamlData.map(async object => {
      // pull client by type
      const client = clients[`${object.type}sClient`]

      // check if the config is already exists
      const config = await client.getByKey(object.key)

      // define the data object
      const data = {
        [`${toSnakeCase(`${object.type}`)}`]: confToDoc(object)
      }

      if (config) {
        // update config
        return client.updateByKey(object.key, data)
      } else {
        // create config
        return client.create(data)
      }
    })

    // resolve all create/update promises
    const rsPrms = await Promise.all(prms)
  }
}

ApplyCommand.description = `Apply a set of configurations to RELE.AI App
...
Please read more about the configuration files in the github repository docs.
`

module.exports = ApplyCommand
