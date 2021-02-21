const cli = require("cli-ux")
const BaseCommand = require("../../utils/base-command")
const { WorkflowsClient, OrgsClient } = require("../../../lib/components")

/**
 * Activate a given workflow to the user's organization
 */
class ActivateCommand extends BaseCommand {
  // command arguments
  static args = [
    {
      name: "key",
      required: true,
      description: "Workflow selector key."
    }
  ]

  /**
   * Search the workflows by the selector key
   *
   * @param {string} key - Workflow selector key.
   * @returns {string} - Workflow ID.
   */
  async _getWorkflowId(key) {
    // resolve access token
    const accessToken = await this.accessToken

    // init workflow client
    const client = new WorkflowsClient(accessToken)

    // get workflow key
    const workflow = await client.getByKey(key)

    // return workflow id
    return workflow.id
  }

  /**
   * Updates the organization active workflows.
   *
   * @param {string} orgId - Organization ID.
   * @param {string} workflowId - Workflow ID.
   */
  async _updateOrgWorkflows(orgId, workflowId) {
    // resolve access token
    const accessToken = await this.accessToken

    // init orgs client
    const client = new OrgsClient(accessToken)

    // update active workflows
    return await client.updateById(
      orgId,
      {
        org: {
          workflows: {
            [workflowId]: true,
          }
        }
      },
      {
        override: false,
      }
    )
  }

  /**
   * Activate the selected workflow on the organization.
   *
   * @param {string} key - Workflow Key
   */
  async _activateWorkflow(key) {
    // get workflow id
    const workflowId = await this._getWorkflowId(key)

    // get user's organization
    const { orgs } = await this.user

    // make sure we have one organization in the list
    if (orgs && orgs.length === 1) {
      // update organization with workflow id
      await this._updateOrgWorkflows(orgs[0], workflowId)
    } else {
      throw new Error("unexpected amount of organization.")
    }
  }

  /**
   * Run the activate command
   */
  async run() {
    // get key
    const { key } = this.args

    // start spinner
    cli.ux.action.start(`Activating workflow ${key}`)

    try {
      // update the user's organization
      await this._activateWorkflow(key)

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
