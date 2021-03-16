const cli = require("cli-ux")
const { flags } = require("@oclif/command")
const { docListToObj } = require("../../utils")
const { docToConf } = require("../../utils/parser")
const { writeConfig } = require("../../utils/writers")
const BaseCommand = require("../../utils/base-command")
const { debugError } = require("../../../lib/utils/logger")
const { WorkflowsClient, OperationsClient, AppsClient, AppActionsClient, VersionsClient, CONF_KEYS_MAP } = require("../../../lib/components")

/**
 * Get a specific operation by the selector key.
 */
class GetCommand extends BaseCommand {
  // command flags
  static flags = {
    // append base command flags
    ...BaseCommand.flags,

    // write to output path
    output: flags.string({
      char: "o",
      description: "A path to output file."
    }),

    // filter by workflow key
    workflowKey: flags.string({
      char: "w",
      description: "Filter by workflow key",
      required: true
    })
  }

  // command arguments
  static args = [
    {
      name: "key",
      required: true,
      description: "Operation selector key."
    }
  ]

  /**
   * Load all selectors data
   */
  loadSelectorsData(accessToken) {
    return [
      // load workflow data
      (new WorkflowsClient(accessToken)).list(),

      // load apps data
      (new AppsClient(accessToken)).list(),

      // load app actions data
      (new AppActionsClient(accessToken)).list(),

      // load app actions data
      (new VersionsClient(accessToken)).list(),

      // load operations data
      (new OperationsClient(accessToken)).list(),
    ]
  }

  /**
   * Find workflow based on key.
   *
   * @param {Array.<object>} workflows - List of workflows.
   * @param {string} key - Workflow key.
   */
  async getWorkflowKey(workflows, key) {
    let vids = await this.versions

    if (vids) {
      if (vids.constructor !== Array) {
        vids = [vids]
      }


      return workflows.filter(workflow => workflow.key === key && vids.includes(workflow.version)).map((w) => w.id)
    } else {
      throw new Error("couldn't find matching verions")
    }
  }

  /**
   * Filter relevant operations based on workflow Ids.
   *
   * @param {Array.<object>} operations - Operations list
   * @param {Array.<string>} workflowIds - List of workflow IDs.
   */
  filterOperations(operations, workflowIds, key) {
    return operations.filter((op) => op.key === key && op.workflows.filter(value => workflowIds.includes(value)).length)
  }

  /**
   * Run the get command that loads the operation
   */
  async run() {
    // destruct args object
    const { key } = this.args

    // destract flags object
    const { output } = this.flags

    // try to pull operation
    try {
      // init loader
      cli.ux.action.start(`Pulling operation ${key}`)

      // resolve access token
      const accessToken = await this.accessToken

      // load selectors data
      const [workflows, apps, appActions, versions, operations] = await Promise.all(this.loadSelectorsData(accessToken))

      // get workflow key
      const workflowIds = await this.getWorkflowKey(workflows, this.flags.workflowKey)
      const filteredOperations = this.filterOperations(operations, workflowIds, key)

      // check response
      if (filteredOperations && filteredOperations.length) {
        const metadata = {
          workflows: docListToObj(workflows),
          apps: docListToObj(apps),
          appActions: docListToObj(appActions),
          versions: docListToObj(versions),
          operations: docListToObj(operations),
        }

        // convert to yaml
        const yamlConf = filteredOperations.map((op) => docToConf(
          "operation",
          op,
          metadata
        )).join("---\n")

        // write output if path provided
        if (output) {
          writeConfig(yamlConf, output)
        } else {
          // return operation object
          this.log(yamlConf)
        }

        // stop spinner
        cli.ux.action.stop()
      } else {
        cli.ux.action.stop(`couldn't find operation for key: ${key}`)
      }
    } catch (error) {
      debugError(error)
      cli.ux.action.stop("falied")
      this.error(`Unable to get operation ${key}.\n${error}`)
    }
  }
}

GetCommand.description = `Get an operation by the operation selector key.
...
Additional information about the operation:get command can be found at https://doc.rele.ai/guide/cli-config.html#rb-operation-get
`

module.exports = GetCommand
