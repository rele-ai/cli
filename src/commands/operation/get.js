const cli = require("cli-ux")
const { flags } = require("@oclif/command")
const { docListToObj } = require("../../utils")
const { docToConf } = require("../../utils/parser")
const { writeConfig } = require("../../utils/writers")
const BaseCommand = require("../../utils/base-command")
const { WorkflowsClient, OperationsClient, AppsClient, AppActionsClient, VersionsClient } = require("../../../lib/components")

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

      // load versions data
      (new VersionsClient(accessToken)).list(),
    ]
  }

  // /**
  //  * Find workflow based on key.
  //  *
  //  * @param {Array.<object>} workflows - List of workflows.
  //  * @param {string} key - Workflow key.
  //  */
  // getWorkflowKey(workflows, key) {
  //   return workflows.find(workflow => workflow.key === key)
  // }

  /**
   * Returns the list conditions matrix.
   *
   * @param {Array.<object>} workflows - List of workflows.
   */
  async getListConditions(workflows) {
    // define conditions
    let conds = []

    // get version id
    const vid = await this.versionId

    // query by version
    if (vid) {
      conds.push(["version", "==", vid])
    }

    // get workflow id
    const workflowId = (workflows.find(workflowObj => workflowObj.key === this.flags.workflowKey)).id

    // add to condition matrix
    conds.push(["workflows", "array-contains", workflowId])

    // return conditions matrix
    return conds
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
      const [workflows, apps, appActions, versions] = await Promise.all(this.loadSelectorsData(accessToken))

      // init operation client
      const client = new OperationsClient(accessToken)

      // get conditions list
      const conds  = await this.getListConditions(workflows)

      // get operation record
      const operation = await client.getByKey(key, conds)

      // check response
      if (operation) {
        // convert to yaml
        const yamlConf = docToConf(
          "operation",
          operation,
          {
            workflows: docListToObj(workflows),
            apps: docListToObj(apps),
            appActions: docListToObj(appActions),
            versions: docListToObj(versions),
          }
        )

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
