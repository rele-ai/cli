const os = require("os")
const fs = require("fs")
const path = require("path")
const cli = require("cli-ux")
const rimraf = require("rimraf")
const inquirer = require("inquirer")
const Metalsmith = require("metalsmith")
const Handlebars = require("handlebars")
const download = require("download-git-repo")
const {Command, flags} = require("@oclif/command")
const render = require("consolidate").handlebars.render
const {isLocalPath, getTemplatePath} = require("../utils/local-path")

const home = os.homedir()
const tmp = path.join(home, ".rb-templates")

// Support types from prompt-for which was used before
const promptMapping = {
  string: 'input',
  boolean: 'confirm'
}

// register handlebars helper
Handlebars.registerHelper('if_eq', function (a, b, opts) {
  return a === b
    ? opts.fn(this)
    : opts.inverse(this)
})

Handlebars.registerHelper('unless_eq', function (a, b, opts) {
  return a === b
    ? opts.inverse(this)
    : opts.fn(this)
})

class CreateCommand extends Command {
  // define the command args
  static args = [
    {
      name: "path",
      required: true,
      description: "Project location path"
    }
  ]

  // define the command flags
  static flags = {
    // path to the template
    template: flags.string({
      char: "t",
      description: "Path to a git repository with the template",
      required: true
    }),

    // should use git clone
    clone: flags.boolean({
      char: "c",
      description: "Use git clone",
      default: false
    })
  }

  /**
   * Load template from local path
   */
  loadLocalTemplate(templatePath) {
    // check if path exists
    if (fs.existsSync(templatePath)) {
      return Promise.resolve(templatePath)
    } else {
      return Promise.reject(`Local template ${templatePath} not found.`)
    }
  }

  /**
   * Download template from git repository
   */
  downloadTemplate(templatePath, clone) {
    cli.ux.action.start("Downloading template")

    // clear template dir
    if (fs.existsSync(tmp)) {
      rimraf.sync(tmp)
    }

    return new Promise((resolve, reject) => {
      download(templatePath, tmp, { clone }, (err) => {
        // handler result
        if (err) {
          // stop spinner
          cli.ux.action.stop("failed")

          // reject errors
          reject(err)
          this.error(`Failed to download repository: ${templatePath}`)
        } else {
          // stop spinner
          cli.ux.action.stop()

          // resolve with tmp path
          resolve(tmp)
        }
      })
    })
  }

  /**
   * Pull local or remote template
   */
  getTemplate(templatePath, clone) {
    // check if local template
    if (isLocalPath(templatePath)) {
      return this.loadLocalTemplate(templatePath)
    } else {
      return this.downloadTemplate(templatePath, clone)
    }
  }

  /**
   * Get meta.js(on) options file.
   *
   * @param {string} dir - Template path tmp.
   * @returns {object} - Meta file.
   */
  getMetadata(dir) {
    const json = path.join(dir, "meta.json")
    const js = path.join(dir, "meta.js")
    let opts = {}

    if (fs.existsSync(json)) {
      // check if json file exists
      // check if js file exists
      opts = require(path.resolve(json))
    } else if (fs.existsSync(js)) {
      // check if js file exists
      const req = require(path.resolve(js))
      if (req !== Object(req)) {
        throw new Error("meta.js needs to expose an object")
      }

      opts = req
    }

    return opts
  }

  /**
   * Evaluate an expression in meta.json in the context of
   * prompt answers data.
   */
  evaluate(exp, data) {
    /* eslint-disable no-new-func */
    const fn = new Function("data", "with (data) { return " + exp + "}")
    try {
      return fn(data)
    } catch (e) {
      console.error(chalk.red("Error when evaluating filter condition: " + exp))
    }
  }

  /**
   * Inquirer prompt wrapper
   */
  async prompt(data, key, prompt) {
    // skip prompts whose when condition is not met
    if (prompt.when && !this.evaluate(prompt.when, data)) {
      return Promise.resolve()
    }

    let promptDefault = prompt.default
    if (typeof prompt.default === "function") {
      promptDefault = function () {
        return prompt.default.bind(this)(data)
      }
    }

    return inquirer.prompt([{
      type: promptMapping[prompt.type] || prompt.type,
      name: key,
      message: prompt.message || prompt.label || key,
      default: promptDefault,
      choices: prompt.choices || [],
      validate: prompt.validate || (() => true)
    }]).then(answers => {
      if (Array.isArray(answers[key])) {
        data[key] = {}
        answers[key].forEach(multiChoiceAnswer => {
          data[key][multiChoiceAnswer] = true
        })
      } else if (typeof answers[key] === "string") {
        data[key] = answers[key].replace(/"/g, '\\"')
      } else {
        data[key] = answers[key]
      }
    })
  }

  /**
   * Ask promopts
   */
  async ask(prompts, data, done) {
    try {
      for (const key of Object.keys(prompts)) {
        await this.prompt(data, key, prompts[key])
      }

      done()
    } catch (err) {
      done(err)
    }
  }

  /**
   * Create a middleware for asking questions.
   *
   * @param {Object} prompts
   * @return {Function}
   */
  askQuestions(prompts) {
    return (files, metalsmith, done) => {
      this.ask(prompts, metalsmith.metadata(), done)
    }
  }

  /**
   * Create a middleware for filtering files.
   *
   * @param {Object} filters
   * @return {Function}
   */
  filterFiles(filters) {
    return (files, metalsmith, done) => {
      const data = metalsmith.metadata()

      if (!filters) {
        return done()
      }
      const fileNames = Object.keys(files)
      Object.keys(filters).forEach(glob => {
        fileNames.forEach(file => {
          if (match(file, glob, { dot: true })) {
            const condition = filters[glob]
            if (!evaluate(condition, data)) {
              delete files[file]
            }
          }
        })
      })
      done()
    }
  }

  /**
   * Template in place plugin.
   *
   * @param {Object} skipInterpolation
   * @returns {Function}
   */
  renderTemplateFiles(skipInterpolation) {
    // update input
    skipInterpolation = typeof skipInterpolation === 'string'
      ? [skipInterpolation]
      : skipInterpolation


    // build render middleware
    return async (files, metalsmith, done) => {
      const keys = Object.keys(files)
      const metalsmithMetadata = metalsmith.metadata()

      for (const file of keys) {
        // skipping files with skipInterpolation option
        if (skipInterpolation && multimatch([file], skipInterpolation, { dot: true }).length) {
          continue
        }

        const str = files[file].contents.toString()
        // do not attempt to render files that do not have mustaches
        if (!/{{([^{}]+)}}/g.test(str)) {
          continue
        }

        await new Promise((resolve, rej) => {
          render(str, metalsmithMetadata, (err, res) => {
            if (err) {
              err.message = `[${file}] ${err.message}`
              return rej(err)
            }
            files[file].contents = Buffer.from(res)
            resolve()
          })
        })
      }

      done()
    }
  }

  /**
   * Display template complete message.
   *
   * @param {String} message
   * @param {Object} data
   */
  logMessage(message, data) {
    if (message) {
      render(message, data, (err, res) => {
        if (err) {
          this.error('\n   Error when rendering template complete message: ' + err.message.trim())
        } else {
          this.log('\n' + res.split(/\r?\n/g).map(line => '   ' + line).join('\n'))
        }
      })
    }
  }

  /**
   * Render and generate template
   */
  async generateTemplate(localPath, destPath) {
    // get meta.js(on) options
    const opts = this.getMetadata(localPath)
    const metalsmith = Metalsmith(path.join(localPath, "template"))
    const data = Object.assign(metalsmith.metadata(), {
      destDirName: destPath,
      inPlace: destPath === process.cwd(),
      noEscape: true
    })

    // update helpers
    if (opts.helpers) {
      Object.keys(opts.helpers).map(key => {
        Handlebars.registerHelper(key, opts.helpers[key])
      })
    }

    const helpers = {}

    if (opts.metalsmith && typeof opts.metalsmith.before === "function") {
      opts.metalsmith.before(metalsmith, opts, helpers)
    }

    metalsmith
      .use(this.askQuestions(opts.prompts))
      .use(this.filterFiles(opts.filters))
      .use(this.renderTemplateFiles(opts.skipInterpolation))

    if (typeof opts.metalsmith === "function") {
      opts.metalsmith(metalsmith, opts, helpers)
    } else if (opts.metalsmith && typeof opts.metalsmith.after === "function") {
      opts.metalsmith.after(metalsmith, opts, helpers)
    }

    metalsmith
      .clean(false)
      .source(".")
      .destination(destPath)
      .build((err, files) => {
        if (err) {
          throw err
        }

        if (typeof opts.complete === "function") {
          const helpers = { files }
          opts.complete(data, helpers)
        } else {
          this.logMessage(opts.completeMessage, data)
        }
      })
  }

  /**
   * parse and generate the project
   * from the template
   */
  async run() {
    // parse user's args
    const {args, flags} = this.parse(CreateCommand)

    try {
      // clone the template
      const templatePath = await this.getTemplate(flags.template, flags.clone)

      try {
        // generate and render template
        await this.generateTemplate(templatePath, path.resolve(args.path || "."))
      } catch (error) {
        this.error(`unable to generate template.\n`, error)
        return
      }
    } catch (error) {
      console.error(error)
      this.error(`unable to get template from: ${flags.template}.\n`)
      return
    }

    // notify the user of successful generation
    this.log("Generated project successfuly.")
  }
}

CreateCommand.description = `Create a RELE.AI integration project from a template
...
Please read more in our documentation website at docs.rele.ai
`

module.exports = CreateCommand
