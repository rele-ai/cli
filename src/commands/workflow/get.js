const cli = require("cli-ux")
const {flags} = require("@oclif/command")
const { docListToObj } = require("../../utils")
const { docToConf } = require("../../utils/parser")
const { writeConfig } = require("../../utils/writers")
const BaseCommand = require("../../utils/base-command")
const { WorkflowsClient, VersionsClient } = require("../../../lib/components")

/**
 * Get a specific workflow by the selector key.
 */
class GetCommand extends BaseCommand {
  // command flags
  static flags = {
    // append base command flags
    ...BaseCommand.flags,

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
   * Load all selectors data
   */
  loadSelectorsData(accessToken) {
    return [
      (new VersionsClient(accessToken)).list(),
    ]
  }

  /**
   * Returns the list conditions matrix.
   */
  async getListConditions() {
    // define conditions
    let conds = []

    // get version id
    const vid = await this.versionId

    // query by version
    if (vid) {
      conds.push(["version", "==", vid])
    }

    // return conditions matrix
    return conds
  }

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

      // load selectors data
      const [versions] = await Promise.all(this.loadSelectorsData(accessToken))

      // init workflow client
      const client = new WorkflowsClient(accessToken)

      // get conditions list
      const conds = await this.getListConditions()

      // get workflow record
      const workflow = await client.getByKey(key, conds)

      // convert to yaml
      const yamlConf = docToConf("workflow", workflow, { versions: docListToObj(versions) })

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
