const {toPascalCase} = require("../utils")
const BaseClient = require("../utils/base")

// list of config types
const TYPES = [
  "apps",
  "app_actions",
  "operations",
  "workflows",
  "translations"
]

/**
 * Components service client
 */
class ComponentsClient extends BaseClient {
  /**
   * Initiate the base client with the proto type.
   */
  constructor() {
    // init base client
    super("components")
  }

  /**
   * Validates a given config object of ${type}.
   *
   * @param {object} config - Config object.
   * @returns {null|string} - Null for validate. String (with error message) for error.
   */
  validate(config) {}

  /**
   * Create a new instance of ${type} with the given config.
   *
   * @param {object} def - Proto service definition.
   * @param {object} config - Config object.
   * @returns {object}
   */
  create(def, config) {
    if (this.validate(config) === null) {
      return this._request(
        def,
        config,
        {
          headers: {
            authorization: `Bearer ${this._accessToken}`
          }
        }
      )
    }
  }

  /**
   * Returns a list of ${type}.
   *
   * @param {object} def - Proto service definition.
   * @returns {Array.<object>} - List of configs.
   */
  list(def) {}

  /**
   * Returns a specific object of ${type} according to the key.
   *
   * @param {object} def - Proto service definition.
   * @param {string} key - Config key.
   * @returns {object} - Config.
   */
  get(def, key) {}

  /**
   * Update a given config according to the key with the given config.
   *
   * @param {object} def - Proto service definition.
   * @param {string} key - Config key.
   * @param {object} config - Config.
   * @returns {object}
   */
  update(def, key, config) {}

  /**
   * Removes a given config based on the key.
   *
   * @param {object} def - Proto service definition.
   * @param {string} key - Config key.
   * @returns {object}
   */
  delete(def, key) {}
}

/**
 * returns a new class pointing to the matching
 * service.
 *
 * @param {string} type - Component type. One of TYPES.
 */
const generateServiceClass = (type) => class extends ComponentsClient {
  /**
   * Initiate the service class.
   *
   * @param {string} accessToken - JWT access token.
   */
  constructor(accessToken) {
    // init the service type
    this._type = type

    // set access token on instance
    this._accessToken = accessToken

    // init component client
    super()

    // definition
    this._serviceDef = this.proto[toPascalCase(type)].service
  }

  /**
   * Validates a given config object of ${type}.
   *
   * @param {object} config - Config object.
   * @returns {null|string} - Null for validate. String (with error message) for error.
   */
  validate(config) {
    super.validate(config)
  }

  /**
   * Create a new instance of ${type} with the given config.
   *
   * @param {object} config - Config object.
   * @returns {object}
   */
  create(config) {
    super.create(this._serviceDef.Create, config)
  }

  /**
   * Returns a list of ${type}.
   *
   * @returns {Array.<object>} - List of configs.
   */
  list() {
    super.list(this._serviceDef.List)
  }

  /**
   * Returns a specific object of ${type} according to the key.
   *
   * @param {string} key - Config key.
   * @returns {object} - Config.
   */
  get(key) {
    super.get(this._serviceDef.Get, key)
  }

  /**
   * Update a given config according to the key with the given config.
   *
   * @param {string} key - Config key.
   * @param {object} config - Config.
   * @returns {object}
   */
  update(key, config) {
    super.update(this._serviceDef.Update, key, config)
  }

  /**
   * Removes a given config based on the key.
   *
   * @param {string} key - Config key.
   * @returns {object}
   */
  delete(key) {
    super.delete(this._serviceDef.Delete, key)
  }
}

/**
 * Generate class name according to standards.
 *
 * @param {string} type - Component type. One of TYPES.
 */
const generateClassName = (type) => {
  return toPascalCase(`${type}Client`)
}

// load all modules
TYPES.forEach((type) => {
  module.exports[generateClassName(type)] = generateServiceClass(type)
})
