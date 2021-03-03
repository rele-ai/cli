const cli = require("cli-ux")
const { flags } = require("@oclif/command")
const BaseCommand = require("../../utils/base-command")
const { WorkflowsClient } = require("../../../lib/components")

/**
 * Activate a given workflow to the user's organization
 */
class ActivateCommand extends BaseCommand {
  // command arguments
  static args = [
    {
      name: "workflows",
      required: true,
      description: "List of workflow keys seperated by a comma.",
      parse: input => input.trim().split(",")
    }
  ]

  // command flags
  static flags = {
    // append base command flags
    ...BaseCommand.flags,

    // append base command flags
    destination: flags.string({
      char: "d",
      description: "Destination config - user or org",
      options: ["user", "org"],
      required: true
    })
  }

  /**
   * Activate the selected workflow on the destination.
   *
   * @param {string} workflows - Workflow keys
   */
  async _activateWorkflow(workflows) {
    // resolve access token
    const accessToken = await this.accessToken

    // init workflow client
    const client = new WorkflowsClient(accessToken)

    // get workflow id
    const workflowIds = await Promise.all(
      workflows.map(async (key) => {
        const workflow = await client.getByKey(key, [], await this.version)

        if (workflow) {
          return workflow.id
        } else {
          throw new Error(`couldn't find workflow key: ${key}`)
        }
      })
    )

    // make request to activate endpoint
    await client.updateActiveWorkflows({
      [this.flags.destination]: {
        append: workflowIds
      }
    })
  }

  /**
   * Run the activate command
   */
  async run() {
    // get key
    const { workflows } = this.args

    // start spinner
    cli.ux.action.start(`Activating workflows ${workflows.join(",")}`)

    try {
      // update the user's organization
      await this._activateWorkflow(workflows)

      // stop spinner
      cli.ux.action.stop()
    } catch (err) {
      // stop spinner fail
      cli.ux.action.stop("failed")
      this.error(`Unable to activate workflow.\n${err}`)
    }
  }
}

ActivateCommand.description = `Activates a given workflow to the user's organization.
...
Please read more about the configuration files in the github repository docs.
`

module.exports = ActivateCommand
