const cli = require("cli-ux")
const plugins = require("../../utils/plugin")
const { docToConf } = require("../../utils/parser")
const BaseCommand = require("../../utils/base-command")
const { TranslationsClient } = require("../../../lib/components")

/**
 * List all global and org releated translations.
 */
class ListCommand extends BaseCommand {
  // command arguments
  static args = [
    {
      name: "key",
      description: "Translation selector key."
    }
  ]

  /**
   * Execute the list translations command
   */
  async run() {
    // start spinner
    cli.ux.action.start("Pulling translations")

    // try to pull translations
    try {
      // resolve access token and user info
      const [accessToken, { user }] = await Promise.all([this.accessToken, this.user])

      // init translations client
      const client = new TranslationsClient(user, accessToken)

      // create conditions
      const conds = this.args.key ? [["key", "==", this.args.key]] : []

      // collect translations records
      const translations = await client.list(conds)

      // execute before write
      plugins.translation.list._execute("beforeWrite", {})

      // check response
      if (translations && translations.length) {
        // return translation records
        const yamlConf = translations.map((translation) => docToConf("translation", translation)).join("---\n")

        // log to user
        this.log(yamlConf)

        // stop spinner
        cli.ux.action.stop()

        // execute success
        plugins.translation.list._execute("success", {})
      } else {
        // execute success
        plugins.translation.list._execute("error", {})
        cli.ux.action.stop("no translations found")
      }
    } catch(error) {
      // execute success
      plugins.translation.list._execute("error", {})

      // handle errors
      cli.ux.action.stop("failed")
      this.error(`unable to list translation:\n${error}`)
    }
  }
}

ListCommand.description = `List all global and org releated translation configs.
...
Additional information about the translation:list command can be found at https://doc.rele.ai/guide/cli-config.html#rb-translation-list
`

module.exports = ListCommand
