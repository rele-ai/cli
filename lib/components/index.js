const BaseClient = require("../utils/base")
const {toPascalCase, JJV, toBytes} = require("../utils")
const { config } = require("cli-ux")

// list of config types
const TYPES = [
  "orgs",
  "users",
  "apps",
  "app_actions",
  "operations",
  "workflows",
  "translations"
]

// map conf keys
const CONF_KEYS_MAP = {
  apps: "system_key",
  app_actions: "operation_key",
  operations: "key",
  workflows: "key",
  translations: "key",
}

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
  validate(config) {
    // check if schema exists
    if (JJV.schema[this._type]) {
      // validate payload against matching schema
      return JJV.validate(this._type, config)
    } else {
      // return missing schema error
      return {
        error: `unable to find matching schema for type: ${this._type}.`
      }
    }
  }

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
          [this._type.slice(0, -1)]: config
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
    const response = await this._request(
      def,
      conditions,
      {
        headers: {
          authorization: `Bearer ${this._accessToken}`
        }
      }
    )

    // pull by type
    return response[this._type]
  }

  /**
   * Returns a specific object of ${type} according to the id.
   *
   * @param {object} def - Proto service definition.
   * @param {string} id - fs id.
   * @returns {object} - Config.
   */
  getById(def, id) {
    // make the get request
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
   * @param {string} id - Config id.
   * @param {object} data - data.
   * @param {object} options - request options.
   * @returns {object}
   */
  update(def, id, data, options) {
    // make the update request
    return this._request(
      def,
      {
        override: true,
        ...options,
        [this._type.slice(0, -1)]: data,
        id,
      },
      {
        headers: {
          authorization: `Bearer ${this._accessToken}`
        }
      }
    )
  }

  /**
   * Removes a given config based on the key.
   *
   * @param {object} def - Proto service definition.
   * @param {string} id - Config id.
   * @returns {object}
   */
  delete(def, id) {
    // make the delete request
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
   * Takes list of records and attach ids,
   * and attach firestore id to all records without
   * ids.
   *
   * @param {object} def - Proto service definition.
   * @param {Array.<object>} records - List of records.
   */
  createRecords(def, records) {
    // make the attach ids
    // to records request
    return this._request(
      def,
      {
        records
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
    this._accessToken = accessToken.id_token

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
   * @param {Array} conds - Additional conditions.
   * @returns {Array.<object>} - List of configs.
   */
  list(conds = []) {
    // set conditions array
    // pulls all org that related to the user's
    // org id, or to global org.
    const conditions = [
      ...conds.map((cond) => toBytes(cond))
    ]

    return super.list(this._serviceDef.List, { conditions })
  }

  /**
   * Returns a specific object of ${type} according to the key.
   *
   * @param {string} key - Config key.
   * @param {Array} conds - Additional conditions.
   * @returns {object} - Config.
   */
  async getByKey(key, conds = []) {
    // set conditions array
    // pulls all org that related to the user's
    // org id, or to global org.
    const conditions = [
      ...conds.map((cond) => toBytes(cond)),
      toBytes([CONF_KEYS_MAP[this._type], "==", key])
    ]

    // list items
    const items = await super.list(this._serviceDef.List, { conditions })

    // check valid length
    if (items) {
      if (items.length < 2) {
        if (items.length === 1) {
          return items[0]
        }
      } else {
        throw new Error(`Found too many ${this._type}. Please contact support@rele.ai`)
      }
    }

    return null
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
   * @returns {Promise.<object>|null}
   */
  async updateByKey(key, config) {
    // get object by key
    const object = await this.getByKey(key)

    // return promise
    if (object) {
      return super.update(this._serviceDef.Update, object.id, config)
    }

    // throw error if getByKey returns null
    throw new Error(`unable to update ${this._type}. No matching ${this._type} found with key equals to ${key}.`)
  }

  /**
   * Update a given config according to the firestore id with the given config.
   *
   * @param {string} id - Document ID.
   * @param {object} data - Update data.
   * @param {object} options - Update options.
   * @returns {object}
   */
  async updateById(id, data, options) {
    return super.update(this._serviceDef.Update, id, data, options)
  }

  /**
   * Delete a given config according to the key.
   *
   * @param {string} key - Config key.
   * @param {Array} conds - Additional conditions.
   * @returns {Promise.<object>|null}
   */
  async deleteByKey(key, conds=[]) {
    // get object by key
    const object = await this.getByKey(key, conds)

    // delete object by returned id
    if (object) {
      return super.delete(this._serviceDef.Delete, object.id)
    }

    // throw error if getByKey returns null
    throw new Error(`unable to delete ${this._type}. No matching ${this._type} found with key equals to ${key}.`)
  }

  /**
   * Delete a given config according to the firestore id.
   *
   * @param {string} key - Config key.
   * @returns {object}
   */
  async deleteById(key) {
    return super.delete(this._serviceDef.Delete, key)
  }

  /**
   * Attach Ids to records list
   *
   * @param {Array.<object>} records
   * @returns {Array.<object>} - records with ids.
   */
  async createRecords(records) {
    return super.createRecords(this._serviceDef.CreateRecords, records)
  }
}

/**
 * Generate class name according to standards.
 *
 * @param {string} type - Component type. One of TYPES.
 */
const generateClassName = (type) => {
  return toPascalCase(type) + "Client"
}

// load all modules
TYPES.forEach((type) => {
  module.exports[generateClassName(type)] = generateServiceClass(type)
})
