const fs = require("fs")
const npm = require("npm")
const glob = require("glob")
const cli = require("cli-ux")
const yaml = require("js-yaml")
const pkgDir = require("pkg-dir")
const ApplyCommand = require("../apply")
const { flags } = require("@oclif/command")
const git = require("simple-git/promise")()
const { generateRbTag } = require("../../utils")
const BaseCommand = require("../../utils/base-command")
const ActivateCommand = require("../workflow/activate")
const { debugError } = require("../../../lib/utils/logger")

/**
 * Define the deploy org command
 */
class DeployOrgCommand extends BaseCommand {
  // command flags
  static flags = {
    // append base command flags
    ...BaseCommand.flags,

    // add hidden config path command
    configPath: flags.string({
      char: "c",
      description: "Custom config dir path",
      hidden: true,
    }),

    // custom indicator
    // for running the deploy.sh script
    runDeployCommand: flags.boolean({
      default: true,
      description: "Deploy.sh indicator",
      hidden: true,
      allowNo: true
    })
  }

  init() {
    super.init()

    // additional pkg locations
    this._pkgLocation = pkgDir.sync(process.cwd())
  }

  /**
   * Execute the user's deployment scritp
   */
  async deployIntegration() {
    // start spinner
    cli.ux.action.start("Deplying integration")

    // load pkg
    const pkg = (require(`${this._pkgLocation}/package.json`) || {})

    // execute npm deploy script
    if (pkg.scripts.deploy) {
      if (this.flags.runDeployCommand) {
        const res = await new Promise((resolve, reject) => {
          return npm.load((err) => {
            // handle load error
            if (err) reject(err)

            // execute command
            npm.commands.run(["deploy", pkg.version], (err, output) => {
              return (err) ? reject(err) : resolve(output)
            })
          })
        })

        // complete process
        cli.ux.action.stop()

        // return promise result
        return res
      }
    } else {
      throw new Error("`npm run deploy` must be available with a deployment script for the integration code.")
    }
  }

  /**
   * Apply all the configurations
   */
  async applyConfigs() {
    // start spinner
    cli.ux.action.start("Deplying configurations")

    // get configs location
    const configLocation = this.flags.configPath || `${this._pkgLocation}/configs`

    // check if configs directory exists
    if (fs.existsSync(configLocation) && fs.lstatSync(configLocation).isDirectory()) {
      // execute apply command
      await ApplyCommand.run(["-f", configLocation])
    } else {
      throw new Error("`$PROJECT_ROOT/config` directory must exists and contain the YAML configs")
    }

    // complete process
    cli.ux.action.stop()
  }

  /**
   * Load all configs of type workflows and extract the keys
   */
  _getWorkflowKeys() {
    // get configs location
    const configLocation = `${this._pkgLocation}/configs`

    // check if configs directory exists
    if (fs.existsSync(configLocation) && fs.lstatSync(configLocation).isDirectory()) {
      let workflowKeys = []

      // load files
      glob
        .sync(`${configLocation}/**/*.yaml`)
        .forEach((yamlLocation) => {
          const file = fs.readFileSync(yamlLocation, "utf-8")
          yaml.loadAll(file).forEach((conf) => {
            if (conf.type === "Workflow") {
              workflowKeys.push(conf.key)
            }
          })
        })

      return workflowKeys
    } else {
      throw new Error("`$PROJECT_ROOT/config` directory must exists and contain the YAML configs")
    }
  }

  /**
   * Activate avaialbe workflows
   */
  async activateWorkflows() {
    // start spinner
    cli.ux.action.start("Activating workflow")

    // load workflow keys
    this.workflowKeys = this._getWorkflowKeys()

    // execute activate command
    await ActivateCommand.run([this.workflowKeys.join(","), "-d", "org"])

    // complete process
    cli.ux.action.stop()
  }

  /**
   * Tag a successful deployemnt version
   */
  async gitTagVersion() {
    // check if git folder exists
    if (fs.existsSync(`${this._pkgLocation}/.git`)) {
      // start spinner
      cli.ux.action.start("Tagging version")

      // create tag
      const pkgVersion = (require(`${this._pkgLocation}/package.json`) || {}).version
      const tag = generateRbTag(pkgVersion)

      // tag force
      await git.tag(["-f", tag])

      // complete process
      cli.ux.action.stop()
    }
  }

  /**
   * Check if user provided a version and if
   * so, check if the version isn't the latest one
   */
  checkIntegrationVersion() {
    const userVersion = this.flags.version
    const pkgVersion = (require(`${this._pkgLocation}/package.json`) || {}).version

    // check if user is on a project directory
    if (!pkgVersion) {
      throw new Error("Please deploy the integration from the project directory.")
    }

    return userVersion && userVersion !== pkgVersion
  }

  /**
   * Git checkout for a given version
   */
  async checkoutVersion() {
    // get target version
    const userVersion = this.flags.version

    // create tag
    const tag = generateRbTag(userVersion)

    // start spinner
    cli.ux.action.start(`Git checkout tags/${tag}`)

    // check if tag exists in git
    const { all } = await git.tags()

    if (all.includes(tag)) {
      // do checkout
      await git.checkout(tag)
    } else {
      // else throw exception on missing tag
      throw new Error(`Unable to find tag: ${tag}`)
    }

    cli.ux.action.stop()
  }

  /**
   * Execute the command logic
   */
  async run() {
    try {
      // check if we should checkout to older version
      if (this.checkIntegrationVersion()) {
        await this.checkoutVersion()
      }

      // deploy integration script
      await this.deployIntegration()

      // apply configs
      await this.applyConfigs()

      // activate workflows
      await this.activateWorkflows()

      // git tag
      await this.gitTagVersion()
    } catch (err) {
      debugError(err)
      cli.ux.action.stop("failed")
      this.error(`Unable to deply integration.\n${err}`)
    }
  }
}

DeployOrgCommand.description = `Deploy your integration and configurations to an org level.
...
Please read more about the deployment process here: https://docs.rele.ai/guide/cli-development.html#rb-deploy-org
`

module.exports = DeployOrgCommand
