const cli = require("cli-ux")
const { flags } = require("@oclif/command")
const BaseCommand = require("../../utils/base-command")
const { WorkflowsClient } = require("../../../lib/components")

/**
 * Deactivate a given workflow from the user's organization
 */
class DeactivateCommand extends BaseCommand {
  // command arguments
  static args = [
    {
      name: "workflows",
      required: true,
      description: "List of workflow keys seperated by a comma.",
      parse: input => input.trim().split(",")
    }
  ]

  static flags = {
    // append base command flags
    ...BaseCommand.flags,

    // append base command flags
    destination: flags.string({
      char: "d",
      description: "Destination config - user or org",
      options: ["user", "org"],
      required: true
    }),

    // collect user emails
    emails: flags.string({
      char: "e",
      default: "",
      description: "List of emails seperated by comma"
    })
  }

  /**
   * Deactivate the selected workflow from the organization.
   *
   * @param {string} workflows - Workflow keys.
   */
  async _deactivateWorkflow(workflows) {
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

    const payload = {
      [this.flags.destination]: {
        remove: workflowIds
      }
    }

    if (this.flags.destination === "user") {
      payload.user.emails = this.flags.emails.split(/,/g).filter(email => !!email)
    }

    // make request to activate endpoint
    await client.updateActiveWorkflows(payload)
  }

  /**
   * Run the deactivate command
   */
  async run() {
    // get key
    const { workflows } = this.args

    // start spinner
    cli.ux.action.start(`Deactivating workflows: ${workflows.join(",")}`)

    try {
      // update the user's organization
      await this._deactivateWorkflow(workflows)

      // stop spinner
      cli.ux.action.stop()
    } catch (err) {
      // stop spinner fail
      cli.ux.action.stop("failed")
      this.error(`Unable to deactivate workflow.\n${err}`)
    }
  }
}

DeactivateCommand.description = `Deactivates a given workflow from the user's organization.
...
Please read more about the configuration files in the github repository docs.
`

module.exports = DeactivateCommand
