const {toPascalCase} = require("../utils")
const BaseClient = require("../utils/base")

// list of config types
const TYPES = [
  "users",
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
        {
          org: "",
          ...config
        },
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
   * @param {Array} conditions - conditions data for list apps.
   * @returns {Array.<object>} - List of configs.
   */
  async list(def, conditions = []) {
    // make the request
    return this._request(
      def,
      conditions,
      {
        headers: {
          authorization: `Bearer ${this._accessToken}`
        }
      }
    )
  }

  /**
   * Returns a specific object of ${type} according to the key.
   *
   * @param {object} def - Proto service definition.
   * @param {string} key - Config key.
   * @returns {object} - Config.
   */
  getByKey(def, key) {

  }

  /**
   * Returns a specific object of ${type} according to the id.
   *
   * @param {object} def - Proto service definition.
   * @param {string} id - fs id.
   * @returns {object} - Config.
   */
  getById(def, id) {
    // make the request
    return this._request(
      def,
      {
        id
      },
      {
        headers: {
          authorization: `Bearer ${this._accessToken}`
        }
      }
    )
  }

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
    // init component client
    super()

    // init the service type
    this._type = type

    // set access token on instance
    this._accessToken = accessToken

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
    return super.validate(config)
  }

  /**
   * Create a new instance of ${type} with the given config.
   *
   * @param {object} config - Config object.
   * @returns {object}
   */
  create(config) {
    return super.create(this._serviceDef.Create, config)
  }

  /**
   * Returns a list of ${type}.
   *
   * @param {Array.<Array>} conditions - array of conditions
   * @returns {Array.<object>} - List of configs.
   */
  list(conditions) {
    return super.list(this._serviceDef.List, { conditions })
  }

  /**
   * Returns a specific object of ${type} according to the key.
   *
   * @param {string} key - Config key.
   * @returns {object} - Config.
   */
  getByKey(key) {
    return super.getByKey(this._serviceDef.Get, key)
  }

  /**
   * Returns a specific object of ${type} according to the key.
   *
   * @param {string} key - Config key.
   * @returns {object} - Config.
   */
  getById(key) {
    return super.getById(this._serviceDef.Get, key)
  }

  /**
   * Update a given config according to the key with the given config.
   *
   * @param {string} key - Config key.
   * @param {object} config - Config.
   * @returns {object}
   */
  update(key, config) {
    return super.update(this._serviceDef.Update, key, config)
  }

  /**
   * Removes a given config based on the key.
   *
   * @param {string} key - Config key.
   * @returns {object}
   */
  delete(key) {
    return super.delete(this._serviceDef.Delete, key)
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
