const cli = require("cli-ux")
const {flags} = require("@oclif/command")
const { docToConf } = require("../../utils/parser")
const { writeConfig } = require("../../utils/writers")
const BaseCommand = require("../../utils/base-command")
const { WorkflowsClient } = require("../../../lib/components")

/**
 * Get a specific workflow by the selector key.
 */
class GetCommand extends BaseCommand {
  // command flags
  static flags = {
    output: flags.string({
      char: "o",
      description: "A path to output file.",
      required: false
    })
  }

  // command arguments
  static args = [
    {
      name: "key",
      required: true,
      description: "Workflow selector key."
    }
  ]

  /**
   * Run the get command that loads the workflows
   */
  async run() {
    // destruct args object
    const { key } = this.args

    // destract flags object
    const { output } = this.flags

    // try to pull workflows
    try {
      // init loader
      cli.ux.action.start(`Pulling workflow ${key}`)

      // resolve access token
      const accessToken = await this.accessToken

      // init workflow client
      const client = new WorkflowsClient(accessToken)

      // get workflow record
      const workflow = await client.getByKey(key)

      // convert to yaml
      const yamlConf = docToConf("workflow", workflow)

      // write output if path provided
      if (output) {
        writeConfig(yamlConf, output)
      } else {
        // return workflow object
        this.log(yamlConf)
      }

      // stop spinner
      cli.ux.action.stop()
    } catch (error) {
      cli.ux.action.stop("falied")
      this.error(`Unable to get workflow ${key}.\n${error}`)
    }
  }
}

GetCommand.description = `Get a workflow by the workflow selector key.
...
Additional information about the workflow:get command can be found at https://doc.rele.ai/guide/cli-config.html#rb-workflow-get
`

module.exports = GetCommand
