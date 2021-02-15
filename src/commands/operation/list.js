const cli = require("cli-ux")
const { flags } = require("@oclif/command")
const { docListToObj } = require("../../utils")
const { docToConf } = require("../../utils/parser")
const BaseCommand = require("../../utils/base-command")
const { WorkflowsClient, OperationsClient, AppsClient, AppActionsClient } = require("../../../lib/components")

/**
 * List all global and org releated operations.
 */
class ListCommand extends BaseCommand {
  // command flags
  static flags = {
    // filter by workflow key
    workflowKey: flags.string({
      char: "w",
      description: "Filter by an workflow key",
    })
  }

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
   * Execute the list operations command
   */
  async run() {
    // start spinner
    cli.ux.action.start("Pulling operations")

    // try to pull operations
    try {
      // resolve access token
      const accessToken = await this.accessToken

      // load selectors data
      const [workflows, apps, appActions] = await Promise.all(this.loadSelectorsData(accessToken))

      // init operations client
      const client = new OperationsClient(accessToken)

      // build conditions
      const conds = this.flags.workflowKey ? [["workflows", "array-contains", this.getWorkflowKey(workflows, this.flags.workflowKey).id]] : []

      // list operations records
      const operations = await client.list(conds)

      // check results
      if (operations && operations.length) {
        // return operations records
        const yamlConf = operations.map((operation) => docToConf(
          "operation",
          operation,
          {
            workflows: docListToObj(workflows),
            apps: docListToObj(apps),
            appActions: docListToObj(appActions),
          }
        )).join("---\n")

        // log to user
        this.log(yamlConf)

        // stop spinner
        cli.ux.action.stop()
      } else {
        cli.ux.action.stop("no operations found")
      }
    } catch(error) {
      console.error(error)
      // handle errors
      cli.ux.action.stop("failed")
      this.error(`unable to list operations:\n${error}`)
    }
  }
}

ListCommand.description = `List all global and org releated operations configs.
...
Additional information about the operation:list command can be found at https://doc.rele.ai/guide/cli-config.html#rb-operation-list
`

module.exports = ListCommand
