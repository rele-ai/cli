const cli = require("cli-ux")
const yaml = require("js-yaml")
const { flags } = require("@oclif/command")
const plugin = require("../../utils/plugin")
const { docListToObj } = require("../../utils")
const { docToConf } = require("../../utils/parser")
const BaseCommand = require("../../utils/base-command")
const { WorkflowsClient, OperationsClient, AppsClient, AppActionsClient, VersionsClient } = require("../../../lib/components")

/**
 * List all global and org releated operations.
 */
class ListCommand extends BaseCommand {
  static flags = {
    // append base command flags
    ...BaseCommand.flags,

    // filter by workflow key
    workflowKey: flags.string({
      char: "w",
      description: "Filter by an workflow key",
    })
  }

  /**
   * check for version on init
   */
  async init() {
    // parse flags
    super.init()

    // check version
    if (this.flags.workflowKey) {
      await this.version
    }
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

      // load versions data
      (new VersionsClient(accessToken)).list()
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
      const [workflows, apps, appActions, versions] = await Promise.all(this.loadSelectorsData(accessToken))

      // init operations client
      const client = new OperationsClient(accessToken)

      // build conditions
      const conds = this.flags.workflowKey ? [["workflows", "array-contains", (await this.getWorkflowKey(workflows, this.flags.workflowKey)).id]] : []

      // list operations records
      const operations = await client.list(conds)

      // check results
      if (operations && operations.length) {
        const metadata = {
          workflows: docListToObj(workflows),
          apps: docListToObj(apps),
          appActions: docListToObj(appActions),
          operations: docListToObj(operations),
          versions: docListToObj(versions),
          shouldDump: false,
        }

        // return operations records
        const data = {
          operations: operations.map((operation) => docToConf(
            "operation",
            operation,
            metadata
          ))
        }

        // execute operations load plugin
        await plugin.operation.list._execute(
          "load",
          data,
          {
            accessToken: await this.accessToken
          }
        )

        // log to user
        this.log(data.operations.map(yaml.dump).join("---\n"))

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
