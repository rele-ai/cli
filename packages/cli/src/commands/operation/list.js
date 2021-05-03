const cli = require("cli-ux")
const yaml = require("js-yaml")
const { flags } = require("@oclif/command")
const plugin = require("../../utils/plugin")
const { docListToObj } = require("../../utils")
const { docToConf } = require("../../utils/parser")
const { writeConfig } = require("../../utils/writers")
const BaseCommand = require("../../utils/base-command")
const { debugError } = require("../../../lib/utils/logger")
const { WorkflowsClient, OperationsClient, AppsClient, AppActionsClient, VersionsClient } = require("../../../lib/components")

/**
 * List all global and org releated operations.
 */
class ListCommand extends BaseCommand {
  static flags = {
    // append base command flags
    ...BaseCommand.flags,

    // output file path
    output: flags.string({
      char: "o",
      description: "A path to output file."
    }),

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
      // load operations data
      (new OperationsClient(accessToken)).list(),

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
    let vids = await this.versions

    if (vids) {
      if (vids.constructor !== Array) {
        vids = [vids]
      }

      return workflows.filter(workflow => workflow.key === key && vids.includes(workflow.version)).map((w) => w.id)
    } else {
      throw new Error("couldn't find matching version.")
    }
  }

  /**
   * Execute the list operations command
   */
  async run() {
    // start spinner
    cli.ux.action.start("Pulling operations")

    // try to pull operations
    try {
      // destract flags object
      const { output } = this.flags

      // resolve access token
      const accessToken = await this.accessToken

      // load selectors data
      let [operations, workflows, apps, appActions, versions] = await Promise.all(this.loadSelectorsData(accessToken))

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

        // filter out relevant operations
        if (this.flags.workflowKey) {
          const workflowIds = await this.getWorkflowKey(workflows, this.flags.workflowKey)

          if (workflowIds.length) {
            operations = operations.filter((op) => op.workflows.filter(value => workflowIds.includes(value)).length)
          } else {
            cli.ux.action.stop("coludn't find matching operations")
            return
          }
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

        // collect yaml data
        const yamlConf = data.operations.map(yaml.dump).join("---\n")

        // write data to file
        // if output provided
        if (output) {
          writeConfig(yamlConf, output)
        }

        // log to user
        this.log(yamlConf)

        // stop spinner
        cli.ux.action.stop()
      } else {
        cli.ux.action.stop("no operations found")
      }
    } catch(error) {
      // handle errors
      debugError(error)
      cli.ux.action.stop("failed")
      this.error(`unable to list operations:\n${error}`)
    }
  }
}

ListCommand.description = `List all global and org releated operations configs.
...
Additional information about the operation:list command can be found at https://docs.rele.ai/guide/cli-config.html#rb-operation-list
`

module.exports = ListCommand
