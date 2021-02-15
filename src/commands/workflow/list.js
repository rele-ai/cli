const cli = require("cli-ux")
const { docToConf } = require("../../utils/parser")
const BaseCommand = require("../../utils/base-command")
const { WorkflowsClient } = require("../../../lib/components")

/**
 * List all global and org releated workflows.
 */
class ListCommand extends BaseCommand {
  /**
   * Execute the list workflow command
   */
  async run() {
    // start spinner
    cli.ux.action.start("Pulling workflows")

    // try to pull workflows
    try {
      // resolve access token
      const accessToken = await this.accessToken

      // init workflows client
      const client = new WorkflowsClient(accessToken)

      // collect workflows records
      const workflows = await client.list()

      // check response
      if (workflows && workflows.length) {
        // return workflow records
        const yamlConf = workflows.map((workflow) => docToConf("workflow", workflow)).join("---\n")

        // log to user
        this.log(yamlConf)

        // stop spinner
        cli.ux.action.stop()
      } else {
        cli.ux.action.stop("no workflows found")
      }
    } catch(error) {
      // handle errors
      cli.ux.action.stop("failed")
      this.error(`unable to list workflows:\n${error}`)
    }
  }
}

ListCommand.description = `List all global and org releated workflow configs.
...
Additional information about the workflow:list command can be found at https://doc.rele.ai/guide/cli-config.html#rb-workflow-list
`

module.exports = ListCommand
