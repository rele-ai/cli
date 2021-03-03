const fs = require("fs")
const csv = require("csv")
const cli = require("cli-ux")
const { flags } = require("@oclif/command")
// const plugins = require("../../utils/plugin")
const { docListToObj } = require("../../utils")
const { docToConf } = require("../../utils/parser")
const BaseCommand = require("../../utils/base-command")
const { TranslationsClient, VersionsClient } = require("../../../lib/components")

/**
 * List all global and org releated translations.
 */
class ListCommand extends BaseCommand {
  // command flags
  static flags = {
    // append base command flags
    ...BaseCommand.flags,

    // write to output path
    output: flags.string({
      char: "o",
      description: "A path to output file."
    }),

    // define the output format
    format: flags.string({
      char: "f",
      description: "Output format",
      default: "yaml",
      options: ["yaml", "csv"]
    })
  }

  // command arguments
  static args = [
    {
      name: "key",
      description: "Translation selector key."
    }
  ]

  /**
   * Export translations to CSV format
   */
  exportTranslationsToCSV(translations) {
    // define the columns
    const columns = {
      lang: "lang",
      value: "value",
      key: "key",
      version: "version"
    }

    // return csv stringify
    return new Promise((resolve, reject) => {
      csv.stringify(translations, { header: true, columns: columns }, (err, output) => err ? reject(err) : resolve(output))
    })
  }

  /**
   * Write confs to output
   */
  writeOutput(data, output) {
    fs.writeFileSync(output, data)
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
   * Execute the list translations command
   */
  async run() {
    // start spinner
    cli.ux.action.start("Pulling translations")

    // try to pull translations
    try {
      // resolve access token and user info
      const accessToken = await this.accessToken

      // load selectors data
      const [versions] = await Promise.all(this.loadSelectorsData(accessToken))
      const vers = docListToObj(versions)

      // init translations client
      const client = new TranslationsClient(accessToken)

      // create conditions
      const conds = this.args.key ? [["key", "==", this.args.key], ["version", "==", (await this.versionId)]] : []

      // collect translations records
      const data = {
        translations: await client.list(conds)
      }

      // check response
      if (data.translations && data.translations.length) {
        // execute before write
        // plugins.translation.list._execute("load", data)

        // return translation records
        let confs
        switch (this.flags.format) {
          case "yaml":
            const metadata = { versions: vers }
            confs = data.translations.map((translation) => docToConf("translation", translation, metadata)).join("---\n")
            break
          case "csv":
            confs = await this.exportTranslationsToCSV(data.translations.map((t) => ({...t, version: vers[t.version].key})))
            break
          default:
            throw new Error(`unexpected format: ${this.flags.format}`)
        }

        // check if should write or log
        if (this.flags.output) {
          this.writeOutput(confs, this.flags.output)
        } else {
          // log to user
          this.log(confs)
        }

        // stop spinner
        cli.ux.action.stop()

        // execute success
        // plugins.translation.list._execute("success", {})
      } else {
        // execute success
        // plugins.translation.list._execute("error", {})
        cli.ux.action.stop("no translations found")
      }
    } catch(error) {
      // execute success
      // plugins.translation.list._execute("error", {})

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
