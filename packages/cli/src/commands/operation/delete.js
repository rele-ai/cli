const cli = require("cli-ux")
const { flags } = require("@oclif/command")
const BaseCommand = require("../../utils/base-command")
const { WorkflowsClient, OperationsClient } = require("../../../lib/components")
const { debugError } = require("../../../lib/utils/logger")

/**
 * Delete an operation from RELE.AI. Only operations
 * that are related to the user's organization can be deleted.
 */
class DeleteCommand extends BaseCommand {
  // command flags
  static flags = {
    // append base command flags
    ...BaseCommand.flags,

    // filter by workflow key
    workflowKey: flags.string({
      char: "w",
      description: "Filter by workflow key",
      required: true
    })
  }

  // define the command arguments
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
    ]
  }

  /**
   * Find workflow based on key.
   *
   * @param {Array.<object>} workflows - List of workflows.
   * @param {string} key - Workflow key.
   */
  async getWorkflowKey(workflows, key) {
    const vid = await this.versionId

    return workflows.find(workflow => workflow.key === key && workflow.version === vid)
  }

  /**
   * Execute the delete command
   */
  async run() {
    // destruct the key from the arguments
    const { key } = this.args

    // start cli spinner
    cli.ux.action.start(`Deleting operation ${key}`)

    // try to delete the operation
    try {
      // resolve access token and user
      const accessToken = await this.accessToken

      // load selectors data
      const [workflows] = await Promise.all(this.loadSelectorsData(accessToken))

      // init operations client
      const client = new OperationsClient(accessToken)

      // get workflow key
      const workflowKey = await this.getWorkflowKey(workflows, this.flags.workflowKey)

      // check for matching workflows
      if (!workflowKey) {
        cli.ux.action.stop("couldn't find matching operations.")
        return
      }

      // delete operation by key
      await client.deleteByKey(key, [["workflows", "array-contains", workflowKey.id]])

      // stop spinner
      cli.ux.action.stop()
    } catch (err) {
      debugError(err)
      cli.ux.action.stop("failed")
      this.error(`Unable to delete operation ${key}.\n${err}`)
    }
  }
}

DeleteCommand.description = `Delete an operation from RELE.AI by the operation key.
...
Additional information about the operation:delete command can be found at https://docs.rele.ai/guide/cli-config.html#rb-operation-delete
`

module.exports = DeleteCommand
