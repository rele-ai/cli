const cli = require("cli-ux")
const BaseCommand = require("../../utils/base-command")
const { TranslationsClient } = require("../../../lib/components")

/**
 * Delete a translation from RELE.AI. Only translations
 * that are related to the user's organization can be deleted.
 */
class DeleteCommand extends BaseCommand {
  static flags = {
    // append base command flags
    ...BaseCommand.flags
  }

  // define the command arguments
  static args = [
    {
      name: "key",
      required: true,
      description: "Translation selector key."
    }
  ]

  /**
   * Execute the delete command
   */
  async run() {
    // destruct the key from the arguments
    const { key } = this.args

    // start cli spinner
    cli.ux.action.start(`Deleting translations for key: ${key}`)

    // try to delete the translations
    try {
      // resolve access token and user
      const accessToken = await this.accessToken

      // init apps client
      const client = new TranslationsClient(accessToken)

      // collect translations records
      const translations = await client.list([["key", "==", this.args.key], ["version", "==", (await this.versionId)]])

      // delete translation by key
      await Promise.all(translations.map((translation) => client.deleteById(translation.id)))

      // stop spinner
      cli.ux.action.stop()
    } catch (err) {
      cli.ux.action.stop("failed")
      this.error(`Unable to delete translation ${key}.\n${err}`)
    }
  }
}

DeleteCommand.description = `Delete a translation from RELE.AI by the translation key.
...
Additional information about the translation:delete command can be found at https://doc.rele.ai/guide/cli-config.html#rb-translation-delete
`

module.exports = DeleteCommand
