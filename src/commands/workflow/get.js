const cli = require("cli-ux")
const {flags} = require("@oclif/command")
const { docListToObj } = require("../../utils")
const { docToConf } = require("../../utils/parser")
const { writeConfig } = require("../../utils/writers")
const BaseCommand = require("../../utils/base-command")
const { debugError } = require("../../../lib/utils/logger")
const { WorkflowsClient, VersionsClient, CONF_KEYS_MAP } = require("../../../lib/components")

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
   * Filter workflows by matching versions.
   *
   * @param {Array.<object>} workflows - List of workflows.
   * @param {Array.<string>} versions - List of version IDs.
   */
  filterWorkflows(workflows, versions) {
    if (versions) {
      if (versions.constructor !== Array) {
        versions = [versions]
      }

      // filter
      return workflows.filter((workflow) => versions.includes(workflow.version))
    } else {
      throw new Error("couldn't find matching versions")
    }
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

      // init workflow client
      const client = new WorkflowsClient(accessToken)

      // load selectors data
      const [versions, workflows] = await Promise.all([
        ...this.loadSelectorsData(accessToken),
        client.list([
          [CONF_KEYS_MAP["workflows"], "==", key]
        ])
      ])

      const filteredWorkflows = this.filterWorkflows(workflows, await this.versions)

      // check if workflow exists
      if (filteredWorkflows && filteredWorkflows.length) {
        const metadata = {
          versions: docListToObj(versions)
        }

        // convert to yaml
        const yamlConf = filteredWorkflows.map((workflow) => docToConf("workflow", workflow, metadata)).join("---\n")

        // write output if path provided
        if (output) {
          writeConfig(yamlConf, output)
        } else {
          // return workflow object
          this.log(yamlConf)
        }

        // stop spinner
        cli.ux.action.stop()
      } else {
        cli.ux.action.stop(`couldn't find workflow for key: ${key}`)
      }
    } catch (error) {
      debugError(error)
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
