const fs = require("fs")
const Ajv = require("ajv")
const glob = require("glob")
const path = require("path")
const grpc = require("@grpc/grpc-js")
const ajvFormats = require("ajv-formats")
const { loadSync } = require("@grpc/proto-loader")

/**
 * Load JSON schemas.
 */
module.exports.loadSchemas = () => {
  // point to schema dir
  const schemasDir = path.join(__dirname, "..", "..", "files", "schema")

  // check if schema path exists
  if (fs.existsSync(schemasDir)) {
    // schemas map
    let schemas = {}

    // load all json files from dir into a single object
    glob
      .sync(`${schemasDir}/*.json`)
      .forEach((file) => {
        // append to map
        schemas[path.parse(file).name.replace(/-/g, "_")] = JSON.parse(fs.readFileSync(file, "utf8"))
      })

    // return map
    return schemas
  } else {
    console.error("unable to find schemas at: ", schemasDir)
  }
}

/**
 * Loads AJV Env
 */
module.exports._getAjvEnv = () => {
  // init env
  const env = new Ajv({
    coerceTypes: true,
    useDefaults: true,
    removeAdditional: true,
    allowUnionTypes: true,
  })

  // enable formats on json schema
  ajvFormats(env)

  // load schemas
  for (const [name, schema] of Object.entries(this.loadSchemas())) {
    env.addSchema(schema, name)
  }

  // return configed env
  return env
}

/**
 * Load proto file.
 *
 * @param {string} packageName - Proto package name.
 */
module.exports.loadProto = (packageName) => {
  // load proto file
  const def = loadSync(
    path.join(__dirname, "..", "..", "files", "proto", `${packageName}.proto`),
    {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: false,
      oneofs: true
    }
  )

  // get package bu def
  return grpc.loadPackageDefinition(def)[packageName]
}

/**
 * Convert text to pascal case.
 *
 * @param {string} str - A text.
 */
module.exports.toPascalCase = (string) => {
  return `${string}`
    .replace(new RegExp(/[-_]+/, 'g'), ' ')
    .replace(new RegExp(/[^\w\s]/, 'g'), '')
    .replace(
      new RegExp(/\s+(.)(\w+)/, 'g'),
      ($1, $2, $3) => `${$2.toUpperCase() + $3.toLowerCase()}`
    )
    .replace(new RegExp(/\s/, 'g'), '')
    .replace(new RegExp(/\w/), s => s.toUpperCase());
}

/* Convert data to bytes.
  *
  * @param {*} data - data to conver to bytes
  */
module.exports.toBytes = (data) => {
  if (data) {
    switch (data.constructor) {
    case Array:
    case Number:
    case String:
    case Object:
      data = JSON.stringify(data)
      return Buffer.from(data)
    default:
      throw new Error("unsupporeted type")
    }
  }
}

// frontend proxy URL
module.exports.FRONTEND_PROXY = process.env.NODE_ENV === "development"
  ? "frontend-proxy.dev.bot.rele.ai"
  : "frontend-proxy.prod.bot.rele.ai"

// export AJV env
module.exports.AJV = this._getAjvEnv()
