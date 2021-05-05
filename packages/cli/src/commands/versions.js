const cli = require("cli-ux")
const BaseCommand = require("../utils/base-command")
const { debugError } = require("../../lib/utils/logger")
const { docListToObj, groupByVersion } = require("../utils")
const { WorkflowsClient, OrgsClient, AppsClient, VersionsClient } = require("../../lib/components")

/**
 * Log all the integration version.
 */
class VersionsCommand extends BaseCommand {
  /**
   * Load all selectors data
   */
  loadSelectorsData(accessToken, orgIds) {
    return [
      // load workflow data
      (new WorkflowsClient(accessToken)).list(),

      // load orgs data
      (new OrgsClient(accessToken)).getById(orgIds[0]),

      // load apps data
      (new AppsClient(accessToken)).list(),

      // load versions data
      (new VersionsClient(accessToken)).list()
    ]
  }

  /**
   * Execute the versions command
   */
  async run() {
    try {
      // start spinner
      cli.ux.action.start("Loading versions")

      // resolve access token
      const user = await this.user
      const accessToken = await this.accessToken

      // load selectors data
      const [workflows, {org}, apps, versions] = await Promise.all(this.loadSelectorsData(accessToken, user.orgs))

      // group items by versions
      const groups = [
        {
          data: groupByVersion("workflows", workflows),
          title: "Workflows"
        },
        {
          data: groupByVersion("apps", apps),
          title: "Apps"
        },
      ]
      const versionsMap = docListToObj(versions)

      // generate output
      let output = []
      for (const entry of groups) {
        output.push("---\n")
        output.push(`${entry.title}:`)
        for (const group of entry.data) {
          const name = Object.keys(group[0].display_name || {}).length ? group[0].display_name.en : (group[0].key || group[0].system_key)
          output.push(`  ${name}:`)

          for (const item of group) {
            switch (entry.title) {
              case "Workflows":
                let mark = []
                if ((org.workflows || {})[item.id]) {
                  mark.push("company")
                }
                if ((user.workflows || {})[item.id]) {
                  mark.push("user")
                }
                mark = mark.length ? ` - Used in ${mark.join(", ")} level` : ""

                output.push(`    • Version ${versionsMap[item.version].key}${mark}`)
                break
              case "Apps":
                output.push(`    • Version ${versionsMap[item.version].key}`)
                break
            }
          }

          output.push("")
        }
      }

      cli.ux.action.stop()
      this.log(output.join("\n"))
    } catch (error) {
      debugError(error)
      cli.ux.action.stop("failed")
      this.error(`Unable to list versions.\n${error}`)
    }
  }
}

VersionsCommand.description = `List all user/org related versions.
...
Please read more about the deployment process here: https://docs.rele.ai/guide/cli-development.html#rb-version
`

module.exports = VersionsCommand
