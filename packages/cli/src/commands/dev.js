const cli = require("cli-ux")
const ngrok = require("ngrok")
const yaml = require("js-yaml")
const nodemon = require("nodemon")
const { execSync } = require("child_process")
const DeployUser = require("./deploy/user")
const { writeConfig } = require("../utils/writers")
const BaseCommand = require("../utils/base-command")
const { readAllConfigs } = require("../utils/readers")

/**
 * Log all the integration version.
 */
class VersionsCommand extends BaseCommand {
  // hide the command from help
  static hidden = true

  // command arguments
  static args = [
    {
      name: "mainFile",
      requried: true,
      description: "Main program file. Will be passed down to nodemon to start the development server."
    }
  ]

  /**
   * Initiate the class
   */
  init() {
    super.init()

    // class attributes
    this._ngrokPorts = []
    this._devConfigLocation = "/tmp/.rb/dev-config.yaml"
  }

  /**
   * Returns the next active port.
   */
  getNextActivePort() {
    // calculate next port
    const newPort = (this._ngrokPorts[this._ngrokPorts.length - 1] || 9089) + 1

    // push new port to state
    this._ngrokPorts.push(newPort)

    // return generated port
    return newPort
  }

  /**
   * Register ngrok URL for each application
   */
  ngrokConnect() {
    return ngrok.connect({
      authtoken: process.env.NGROK_TOKEN,
      addr: this.getNextActivePort()
    })
  }

  /**
   * Copy configs to tmp folder and update applications
   * with ngrok URL.
   */
  async prepareDevConfigs() {
    // notify user
    cli.ux.action.start("Preparing development configs")

    // load yaml configs
    let files = (await readAllConfigs(process.cwd())).flatMap(yaml.loadAll)

    // update app configs
    files = files
      .map(async (file) => {
        // check if file is of type app
        // and set a new ngrok URL
        if (file.type === "App") {
          file.base_url = await this.ngrokConnect()
        }

        return file
      })

    // dump as long yaml
    const filesYaml = (await Promise.all(files))
      .map(yaml.dump)
      .join("---\n")

    // write development configs to tmp file
    writeConfig(filesYaml, this._devConfigLocation)

    // stop notification
    cli.ux.action.stop()
  }

  /**
   * Deploy development configs to user level.
   */
  async deployDevConfigs() {
    // notify user about config deployment
    cli.ux.action.start("Deploying development configurations")

    // execute the rb deploy:user command
    const { email } = await this.jwt
    await DeployUser.run([email])

    // stop spinner
    cli.ux.action.stop()
  }

  /**
   * Graceful shutdown for the development server
   */
  async teardown() {
    // stop ngrok process
    await ngrok.kill()

    // kill process
    process.exit()
  }

  /**
   * Setup dev script.
   */
  async setup() {
    // prepare dev configs
    // copy to tmp and update application yamls with ngrok url
    await this.prepareDevConfigs()

    // updating and deploying dev configs
    await this.deployDevConfigs()
  }

  /**
   * Execute the versions command
   */
  async run() {
    // start nodemon
    nodemon({ script: this.args.mainFile })

    // define setup and teardown
    const that = this
    nodemon
      .on("start", () => {
        that.setup()
      })
      .on("restart", () => {
        that.setup()
      })
      .on("quit", () => {
        that.teardown()
      })
  }
}

VersionsCommand.description = `Start a development server for a RELE.AI project
...
Please read more about the deployment process here: https://docs.rele.ai/guide/cli-development.html
`

module.exports = VersionsCommand
