const cli = require("cli-ux")
const BaseCommand = require("../../utils/base-command")
const { WorkflowsClient } = require("../../../lib/components")

/**
 * Delete a workflow from RELE.AI. Only workflows
 * that are related to the user's organization can be deleted.
 */
class DeleteCommand extends BaseCommand {
  // define the command arguments
  static args = [
    {
      name: "key",
      required: true,
      description: "Workflow selector key."
    }
  ]

  /**
   * Execute the delete command
   */
  async run() {
    // destruct the key from the arguments
    const { key } = this.args

    // start cli spinner
    cli.ux.action.start(`Deleting workflow ${key}`)

    // try to delete the workflow
    try {
      // resolve access token and user
      const [accessToken, { user }] = await Promise.all([this.accessToken, this.user])

      // init workflows client
      const client = new WorkflowsClient(user, accessToken)

      // delete workflow by key
      await client.deleteByKey(key)

      // stop spinner
      cli.ux.action.stop()
    } catch (err) {
      cli.ux.action.stop("failed")
      this.error(`Unable to delete workflow ${key}.\n${err}`)
    }
  }
}

DeleteCommand.description = `Delete a workflow from RELE.AI by the workflow key.
...
Additional information about the workflow:delete command can be found at https://doc.rele.ai/guide/cli-config.html#rb-workflow-delete
`

module.exports = DeleteCommand
