const pkgDir = require("pkg-dir")
const BaseClient = require("../utils/base")
const {toPascalCase, JJV, toBytes} = require("../utils")

// list of config types
const TYPES = [
  "orgs",
  "users",
  "apps",
  "app_actions",
  "operations",
  "workflows",
  "translations",
  "versions"
]

// map conf keys
const CONF_KEYS_MAP = {
  apps: "system_key",
  app_actions: "operation_key",
  operations: "key",
  workflows: "key",
  translations: "key",
  versions: "key"
}
module.exports.CONF_KEYS_MAP = CONF_KEYS_MAP

/**
 * Components service client
 */
class ComponentsClient extends BaseClient {
  /**
   * Initiate the base client with the proto type.
   */
  constructor(accessToken) {
    // init base client
    super("components")

    // set access token on instance
    this._accessToken = accessToken.id_token

    // load latest project version
    this.pkgVersion = require(`${pkgDir.sync(__dirname)}/package.json`).version
  }

  /**
   * Returns the version ID from firestore
   */
  getVersionId(version, removeGlobal=false, getMultiple=false, getIds=true) {
    if (!version) {
      version = this.pkgVersion
    }

    return this._list(
      this.proto.Versions.service.List,
      {
        remove_global: removeGlobal,
        conditions: [
          toBytes(["key", "==", version])
        ]
      },
      "versions"
    ).then((versions) => {
      if ((versions || []).length === 0) {
        return null
      } else if ((versions || []).length === 1) {
        return versions[0].id
      } else {
        if (getMultiple) {
          return getIds ? versions.map((v) => v.id) : versions
        } else {
          throw new Error("too many matching versions. please contact support@rele.ai")
        }
      }
    })
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
   * @param {string} type - override type
   * @returns {object}
   */
   create(def, config, type = "") {
    if (this.validate(config) === null) {
      return this._request(
        def,
        {
          org: "",
          [type || this._singularType]: config
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
   * @param {string} type - the response type
   * @returns {Array.<object>} - List of configs.
   */
  async _list(def, conditions = {}, type = "") {
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
    return response[type || this._type]
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
        [this._singularType]: data,
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
   * @param {string} version - operations version
   */
  createRecords(def, records, version) {
    // make the attach ids
    // to records request
    return this._request(
      def,
      {
        records,
        version
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
const generateServiceClass = (type) => {
  // init component class
  const componentClass = class extends ComponentsClient {
    /**
     * Initiate the service class.
     *
     * @param {string} accessToken - JWT access token.
     */
    constructor(accessToken) {
      // init component client
      super(accessToken)

      // init the service type
      this._type = type

      // init singular service type
      this._singularType = this._type.slice(0, -1)

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
    async create(config, version) {
      // define version
      const versionNumber = version || this.pkgVersion

      // check if exists
      let versionId = await this.getVersionId(versionNumber, true)

      if (!versionId) {
        // create version
        const versionRes = await super.create(
          this.proto.Versions.service.Create,
          {
            key: versionNumber
          },
          "version"
        )

        // replace to new version id
        versionId = versionRes.id
      }

      return super.create(this._serviceDef.Create, {...config, version: versionId })
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

      return super._list(this._serviceDef.List, { conditions })
    }

    /**
     * Returns a specific object of ${type} according to the key.
     *
     * @param {string} key - Config key.
     * @param {Array} conds - Additional conditions.
     * @returns {object} - Config.
     */
    async getByKey(key, conds = [], version = "", removeGlobal = false) {
      // set conditions array
      // pulls all org that related to the user's
      // org id, or to global org.
      let conditions = [
        ...conds.map((cond) => toBytes(cond)),
        toBytes([CONF_KEYS_MAP[this._type], "==", key])
      ]

      // check if version is provided and add to query
      if (version) {
        conditions.push(toBytes(["version", "==", await this.getVersionId(version, removeGlobal)]))
      }

      // list items
      const items = await super._list(this._serviceDef.List, { conditions })

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
     * @param {Array} conds - Additional conditions.
     * @returns {Promise.<object>|null}
     */
    async updateByKey(key, config, cond = []) {
      // get object by key
      const object = await this.getByKey(key, cond, "", true)

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
     * @param {string} version - Version ID.
     * @returns {Promise.<object>|null}
     */
    async deleteByKey(key, conds=[], version="") {
      // get object by key
      const object = await this.getByKey(key, conds, version, true)

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
     * @param {string} version
     * @returns {Array.<object>} - records with ids.
     */
    async createRecords(records, version) {
      return super.createRecords(this._serviceDef.CreateRecords, records, version)
    }
  }

  // type specific changes
  switch (type) {
    case "workflows":
      componentClass.prototype.updateActiveWorkflows = function(activeWorkflows) {
        // make the get request
        return this._request(
          this._serviceDef.ActivateWorkflow,
          activeWorkflows,
          {
            headers: {
              authorization: `Bearer ${this._accessToken}`
            }
          }
        )
      }
  }

  return componentClass
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
