const cli = require("cli-ux")
const { flags } = require("@oclif/command")
const BaseCommand = require("../../utils/base-command")
const { WorkflowsClient, CONF_KEYS_MAP } = require("../../../lib/components")
const inquirer = require("inquirer")

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

    // build payload
    const payload = {
      [this.flags.destination]: {
        append: workflowIds
      }
    }

    if (this.flags.destination === "user") {
      payload.user.emails = this.flags.emails.split(/,/g).filter(email => !!email)
    }

    // make request to activate endpoint
    await client.updateActiveWorkflows(payload)
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
