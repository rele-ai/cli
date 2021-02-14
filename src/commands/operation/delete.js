const cli = require("cli-ux")
const { flags } = require("@oclif/command")
const BaseCommand = require("../../utils/base-command")
const { WorkflowsClient, OperationsClient } = require("../../../lib/components")

/**
 * Delete an operation from RELE.AI. Only operations
 * that are related to the user's organization can be deleted.
 */
class DeleteCommand extends BaseCommand {
  // command flags
  static flags = {
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
  loadSelectorsData(user, accessToken) {
    return [
      // load workflow data
      (new WorkflowsClient(user, accessToken)).list(),
    ]
  }

  /**
   * Find workflow based on key.
   *
   * @param {Array.<object>} workflows - List of workflows.
   * @param {string} key - Workflow key.
   */
  getWorkflowKey(workflows, key) {
    return workflows.find(workflow => workflow.key === key)
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
      const [accessToken, { user }] = await Promise.all([this.accessToken, this.user])

      // load selectors data
      const [workflows] = await Promise.all(this.loadSelectorsData(user, accessToken))

      // init operations client
      const client = new OperationsClient(user, accessToken)

      // delete operation by key
      await client.deleteByKey(key, [["workflows", "array-contains", this.getWorkflowKey(workflows, this.flags.workflowKey).id]])

      // stop spinner
      cli.ux.action.stop()
    } catch (err) {
      cli.ux.action.stop("failed")
      this.error(`Unable to delete operation ${key}.\n${err}`)
    }
  }
}

DeleteCommand.description = `Delete an operation from RELE.AI by the operation key.
...
Additional information about the operation:delete command can be found at https://doc.rele.ai/guide/cli-config.html#rb-operation-delete
`

module.exports = DeleteCommand
