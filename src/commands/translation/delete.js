const cli = require("cli-ux")
const BaseCommand = require("../../utils/base-command")
const { TranslationsClient, VersionsClient } = require("../../../lib/components")

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
   * Init clients
   */
   async _initClients() {
    // resolve access token and user info
    const accessToken = await this.accessToken

    // return clients
    return {
      Translation: new TranslationsClient(accessToken),
      Version: new VersionsClient(accessToken)
    }
  }

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
      // collect init clients promises
      this._clients = await this._initClients()

      // pull determine if it's rele.ai user
      const isRele = (await this.user).emails[0].endsWith("@rele.ai")

      // collect version promises
      const prms = (await this.versions).map(async vrId => {
        const { version = {} } = await this._clients.Version.getById(vrId)
        return version
      })

      // resolve versions promises
      const versions = await Promise.all(prms)

      // find version
      const versionId = versions.find(version => {
        if (isRele) {
          return version.org === "global"
        } else {
          return version.org !== "global"
        }
      })

      // version id error handling
      if (!versionId) {
        throw new Error("can't find matching version for translation delete.")
      }

      // collect translations records
      const translations = await this._clients.Translation.list([["key", "==", this.args.key], ["version", "==", versionId.id]])

      // throw an error if there is no translations founded
      if (!((translations || []).length)) {
        throw new Error(`unable to find translations with key of ${this.args.key}`)
      }

      // delete translation by key
      await Promise.all((translations || []).map((translation) => this._clients.Translation.deleteById(translation.id)))

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
