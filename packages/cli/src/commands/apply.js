const cli = require("cli-ux")
const pkgDir = require("pkg-dir")
const plugin = require("../utils/plugin")
const { flags } = require("@oclif/command")
const { confToDoc } = require("../utils/parser")
const { readConfig } = require("../utils/readers")
const { debugError } = require("../../lib/utils/logger")
const { docListToObj, stagesByTypes, toSnakeCase } = require("../utils/index")
const BaseCommand = require("../utils/base-command")
const {
  WorkflowsClient,
  AppsClient,
  TranslationsClient,
  AppActionsClient,
  OperationsClient,
  VersionsClient,
  CONF_KEYS_MAP
} = require("../../lib/components")

class ApplyCommand extends BaseCommand {

  // command flags
  static flags = {
    // append base command flags
    ...BaseCommand.flags,

    path: flags.string({
      char: "f",
      description: "A path to source yaml file.",
      required: false
    })
  }

  /**
   * Load all selectors data
   */
  async loadSelectorsData() {
    const clients = await this._initClients()

    // return selector data
    return [
      // load workflow data
      clients.Workflow.list(),

      // load apps data
      clients.App.list(),

      // load app actions data
      clients.AppAction.list(),

      // load versions
      clients.Version.list(),
    ]
  }

  /**
   * _formatConfToDoc takes an object in YAML
   * format and convert it to JSON.
   */
  async _formatConfToDoc(object, { workflows, apps, appActions, versions, client }) {
    // define the data object
    return confToDoc(
      object.type,
      object,
      {
        workflows: docListToObj(workflows),
        apps: docListToObj(apps),
        appActions: docListToObj(appActions),
        versions: docListToObj(versions),
        user: await this.user,
        client
      }
    )
  }

  /**
   * _getConditionsList checks if extra conditions
   * for getByKey request are nessesary.
   */
  _getConditionsList(object, { apps = [] }) {
    // defines conditions list
    let conditions = []

    // checks if extra conditions
    // needed
    switch (object.type) {
    case "Translation":
      conditions.push(["lang", "==", object.lang])
      break
    case "AppAction":
      conditions.push([
        "app_id", "==", (apps.find(app => app.system_key === object.selector.app)).id,
      ])
      break
    default:
      break
    }

    // return extra conditions
    return conditions
  }

  /**
   * generate operations records on firestore.
   */
  async _generateOperations(operationsConfs) {
    // destract version
    let versionsIds = await this.versions
    if (versionsIds) {
      if (versionsIds.constructor !== Array) {
        versionsIds = [versionsIds]
      }
    } else {
      throw new Error("couldn't find matching versions")
    }

    // load selectors data
    const [workflows, apps, appActions, versions] = await Promise.all(await this.loadSelectorsData())

    // define metadata
    const metadata = {
      workflows: docListToObj(workflows),
      apps: docListToObj(apps),
      appActions: docListToObj(appActions),
      versions: docListToObj(versions),
      user: await this.user,
      client: this._clients.Operation
    }

     // if thirdStage includes operations , validate that there is is_root configuration
    if(operationsConfs.length && !this._validateIsRootOperation(operationsConfs)){
        throw new Error("is_root configuration is missing")
    }
    // format operations confs to
    // operations docs
    const operationsDocs = operationsConfs.map(conf => confToDoc(conf.type, conf, metadata))
    if (operationsDocs.length) {
      // create operations records
      await this._clients.Operation.createRecords(operationsDocs, versionsIds)
    }
  }

  /**
   * generate config record on firestore.
   */
  async _generateRecord(object, versionId) {
    // load selectors data
    const [workflows, apps, appActions, versions] = await Promise.all(await this.loadSelectorsData())

    // destract version
    const vids = (await this.versions || [])

    // pull client by type
    const client = this._clients[object.type]

    // format conf to doc
    const data = await this._formatConfToDoc(
      object,
      {
        workflows,
        apps,
        appActions,
        versions,
        client
      }
    )

    // get additional conditions
    const conditions = this._getConditionsList(object, { apps })

    // check if the config is already exists
    const configs = ((await client.list([
      ...conditions,
      [CONF_KEYS_MAP[`${toSnakeCase(object.type)}s`], "==", object.key]
    ])) || []).filter((conf) => vids.includes(conf.version))

    if (configs.length > 1) {
      throw new Error(`found duplicated ${object.type}. please contact support@rele.ai`)
    }

    const [config] = configs

    if (config) {
      // update config
      return client.updateById(config.id, { ...data, version: config.version })
    } else {
      // create config
      return client.create(data, versionId)
    }

  }

  /**
   * Init clients
   */
  async _initClients() {
    // resolve access token and user info
    const accessToken = await this.accessToken

    // return clients
    return {
      Workflow: new WorkflowsClient(accessToken),
      App: new AppsClient(accessToken),
      Translation: new TranslationsClient(accessToken),
      AppAction: new AppActionsClient(accessToken),
      Operation: new OperationsClient(accessToken),
      Version: new VersionsClient(accessToken)
    }
  }

  /**
   * Validate that there is at least one is_root configuration
   * @param {array} Operations - Each element in the array is one operation from the wf yaml
   * @returns {boolean}
   */
  _validateIsRootOperation(Operations){
          return Operations.some((operation) => operation.is_root === true)
  }
  /**
   * Validate version
   */
  async _validateVersion() {
    // package version
    const packageVersion = require(`${pkgDir.sync(__dirname)}/package.json`).version

    // define version
    const versionNumber = (await this.version) || packageVersion

    // check if exists
    let versionId = await this._clients.Version.getVersionId(versionNumber, true, true, false)

    if (versionId && versionId.constructor === Array) {
      versionId = (versionId.find((v) => v.org !== "global") || {}).id
    }

    if (!versionId) {
      // create version
      const versionRes = await this._clients.Version.create(
        {
          key: versionNumber
        }
      )

      // replace to new version id
      versionId = versionRes.id
    }

    // return the version id
    return versionId
  }

  async run() {
    try {
      // start spinner
      cli.ux.action.start("Applying configuration file")

      // collect init clients promises
      this._clients = await this._initClients()

      // destract path
      const { path } = this.flags

      // format yaml to array of objects
      const data = { yamlData: readConfig(path) }
      // validate that there is no empty yaml
      data.yamlData.forEach(conf => {
        if (!conf) {
          throw new Error("One of the configurations you want to upload is empty.\n Please make sure that there is no unnecessary '---' splitted mark.")
        }
      })

      await plugin.apply._execute(
        "load",
        data,
        {
          accessToken: await this.accessToken
        }
      )

      // destract stages
      let [firstStage = [], secondStage = [], thirdStage = []] = stagesByTypes(data.yamlData)

      // gets the version, and create it
      // if nessesary
      const versionId = await this._validateVersion()

      // collect first stage promises
      await Promise.all(
        firstStage.map(async object => {
          return this._generateRecord(object, versionId)
        })
      )

      // collect second stage promises
      await Promise.all(
        secondStage.map(async object => {
          return this._generateRecord(object, versionId)
        })
      )

      // collect third stage promises
      await this._generateOperations(thirdStage)

      // stop spinner
      cli.ux.action.stop()
    } catch (error) {
      debugError(error)
      cli.ux.action.stop("failed")
      this.error(`Unable to apply configuration file.\n${error}`)
    }
  }
}

ApplyCommand.description = `Apply a set of configurations to RELE.AI App
...
Please read more about the configuration files in the github repository docs.
`

module.exports = ApplyCommand
