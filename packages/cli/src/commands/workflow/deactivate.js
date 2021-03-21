const cli = require("cli-ux")
const { flags } = require("@oclif/command")
const BaseCommand = require("../../utils/base-command")
const { debugError } = require("../../../lib/utils/logger")
const { WorkflowsClient, CONF_KEYS_MAP } = require("../../../lib/components")
const inquirer = require("inquirer")

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
   * Ask the user which workflow should be used.
   *
   * @param {Array.<object>} workflows - List of workflows.
   */
     async ask(workflows) {
      const clearWorkflows = workflows.map((w) => ({ data: `Name: ${w.display_name.en}\n   Is Global Workflow: ${w.org === "global"}`, id: w.id }))
      const message = `We found multiple workflows that matched your query. Please select the releavnt workflow`

      return inquirer.prompt([{
        type: "list",
        name: "workflow",
        message,
        choices: clearWorkflows.map((op) => op.data)
      }]).then((answer) => {
        return clearWorkflows.find((op) => op.data === answer.workflow)
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
    let workflowIds = []
    for (const key of workflows) {
      const workflows = await client.list([
        [CONF_KEYS_MAP["workflows"], "==", key],
      ])

      if (workflows && workflows.length) {
        const workflow = workflows.length > 1 ? await this.ask(workflows) : workflows[0]
        workflowIds.push(workflow.id)
      } else {
        throw new Error(`couldn't find workflow key: ${key}`)
      }
    }

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
      debugError(err)
      cli.ux.action.stop("failed")
      this.error(`Unable to deactivate workflow.\n${err}`)
    }
  }
}

DeactivateCommand.description = `Deactivates a given workflow from the user's organization.
...
Additional information about the workflow:deactivate command can be found at https://docs.rele.ai/guide/cli-config.html#rb-workflow-deactivate
`

module.exports = DeactivateCommand
