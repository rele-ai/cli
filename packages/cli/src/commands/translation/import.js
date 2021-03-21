const fs = require("fs")
const csv = require("csv")
const cli = require("cli-ux")
const { flags } = require("@oclif/command")
const BaseCommand = require("../../utils/base-command")
const { debugError } = require("../../../lib/utils/logger")
const { TranslationsClient } = require("../../../lib/components")

/**
 * Import translations CSV
 */
class ImportCommand extends BaseCommand {
  // command flags
  static flags = {
    // write to output path
    file: flags.string({
      char: "f",
      description: "A path to output file.",
      required: true
    }),

    // define the output format
    format: flags.string({
      hidden: true,
      description: "File format",
      default: "csv",
      options: ["csv"]
    })
  }

  /**
   * Load translations file.
   *
   * @param {string} filePath - Path to translations file.
   */
  loadFile(filePath) {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath)
    } else {
      throw new Error("the provided file path does not exists")
    }
  }

  /**
   * Convert file data from CSV to translations docs.
   *
   * @param {Buffer} data - Convert translations data from CSV to docs.
   */
  convertFromCSV(data) {
    return new Promise((resolve, reject) => {
      csv.parse(data.toString("utf8"), { columns: true }, (err, output) => err ? reject(err) : resolve(output))
    })
  }

  /**
   * Update/create translations based on key.
   *
   * @param {Array.<object>} translations - Translations data.
   */
  async uploadTranslations(translations) {
    // resolve access token
    const accessToken = await this.accessToken

    // init translations client
    const client = new TranslationsClient(accessToken)

    // for each translation check if
    // it exists and update or create
    return await Promise.all(
      translations.flatMap(async (translation) => {
        // update version id
        let versionId = await client.getVersionId(translation.version, true, true, false)
        versionId = versionId.constructor === Array && versionId.length === 2 ? versionId.find(v => v.org === "global").id : versionId

        if (versionId) {
          // try to get translation by key
          const conf = await client.getByKey(translation.key, [["lang", "==", translation.lang], ["version", "==", versionId]], true)

          // check if translation exists
          if (conf) {
            return client.updateById(conf.id, translation)
          } else {
            return client.create(translation, translation.version)
          }
        } else {
          throw new Error("couldn't find matching version")
        }
      })
    )
  }

  /**
   * Run import command
   */
  async run() {
    // start spinner
    cli.ux.action.start("Importing translations")

    try {
      // load file
      const fileData = this.loadFile(this.flags.file)

      // convert file data to translations docs
      let translations
      switch (this.flags.format) {
        case "csv":
          translations = await this.convertFromCSV(fileData)
          break
        default:
          throw new Error(`unsupported translation format: ${this.flags.format}`)
      }

      // update/create translations by key
      if (translations) {
        await this.uploadTranslations(translations)
      } else {
        throw new Error("can not import empty file")
      }

      cli.ux.action.stop()
    } catch (err) {
      debugError(err)
      cli.ux.action.stop("failed")
      this.error(`unable to import translations.\n${err}`)
    }
  }
}

ImportCommand.description = `Import a translations CSV file.
...
Please read more about the configuration files in the github repository docs.
`

module.exports = ImportCommand
