const cli = require("cli-ux")
const { flags } = require("@oclif/command")
const { docListToObj } = require("../../utils")
const { docToConf } = require("../../utils/parser")
const { writeConfig } = require("../../utils/writers")
const BaseCommand = require("../../utils/base-command")
const { debugError } = require("../../../lib/utils/logger")
const { WorkflowsClient, VersionsClient } = require("../../../lib/components")

/**
 * List all global and org releated workflows.
 */
class ListCommand extends BaseCommand {
  static flags = {
    // append base command flags
    ...BaseCommand.flags,

    // output file path
    output: flags.string({
      char: "o",
      description: "A path to output file."
    })
  }

  /**
   * Load all selectors data
   */
  loadSelectorsData(accessToken) {
    return [
      // load versions data
      (new VersionsClient(accessToken)).list()
    ]
  }

  /**
   * Execute the list workflow command
   */
  async run() {
    // start spinner
    cli.ux.action.start("Pulling workflows")

    // try to pull workflows
    try {
      // destract flags
      const { output } = this.flags

      // resolve access token
      const accessToken = await this.accessToken

      // load selectors data
      const [versions] = await Promise.all(this.loadSelectorsData(accessToken))

      // init workflows client
      const client = new WorkflowsClient(accessToken)

      // collect workflows records
      const workflows = await client.list()

      // check response
      if (workflows && workflows.length) {
        const metadata = {
          versions: docListToObj(versions)
        }

        // return workflow records
        const yamlConf = workflows.map((workflow) => docToConf("workflow", workflow, metadata)).join("---\n")

        // log to user
        this.log(yamlConf)

        // write configs to file
        if (output) {
          writeConfig(yamlConf, output)
        }

        // stop spinner
        cli.ux.action.stop()
      } else {
        cli.ux.action.stop("no workflows found")
      }
    } catch(error) {
      // handle errors
      debugError(error)
      cli.ux.action.stop("failed")
      this.error(`unable to list workflows:\n${error}`)
    }
  }
}

ListCommand.description = `List all global and org releated workflow configs.
...
Additional information about the workflow:list command can be found at https://docs.rele.ai/guide/cli-config.html#rb-workflow-list
`

module.exports = ListCommand
