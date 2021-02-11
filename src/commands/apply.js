const {Command, flags} = require('@oclif/command')
const { readConfig } = require("../utils/readers")
const { confToDoc } = require("../utils/parser")
const BaseCommand = require("../utils/base-command")
const { AppsClient } = require("../../lib/components")

class ApplyCommand extends BaseCommand {
  async run() {
    // get flags
    // const {config} = this.parse(ApplyCommand).flags
    // resolve access token and user info
    // const [accessToken, { user }] = await Promise.all([this.accessToken, this.user])

    // init apps client
    // const appsClient = new AppsClient(user, accessToken)

    // await appsClient.deleteByKey("matan_test")

    // read the yaml config
    const yamlData = readConfig(config)
    this.log(yamlData)

    // convert to object
    const { docType, doc } = confToDoc(yamlData)

    // apply
    const res = await componentsApi[docType].write(doc)
    this.log(`config applied to id: ${res.id}`)
  }
}

ApplyCommand.description = `Apply a set of configurations to RELE.AI App
...
Please read more about the configuration files in the github repository docs.
`

// ApplyCommand.flags = {
//   config: flags.string({
//     char: "c",
//     description: "A path to the configuration file",
//     required: true
//   })
// }

module.exports = ApplyCommand
