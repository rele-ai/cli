// Paths to google.protobuf.Value
const PATHS_TO_PROTO_VALUES = [
  "operation.payload.$ANY.data",
  "operation.input.format_function.$ANY.value.data",
  "operation.input.redis_functions.$ANY.value.data",
  "operation.output.format_function.$ANY.value.data",
  "operation.output.redis_functions.$ANY.value.data",
  "records.$ANY.payload.$ANY.data",
  "records.$ANY.payload.$ANY.default.data",
  "records.$ANY.payload.$ANY.default.vars.$ANY.data",
  "records.$ANY.payload.$ANY.vars.$ANY.data",
  "records.$ANY.payload.$ANY.vars.$ANY.default.data",
  "records.$ANY.input.format_function.$ANY.value.data",
  "records.$ANY.input.format_function.$ANY.value.vars.$ANY.data",
  "records.$ANY.input.format_function.$ANY.value.default.data",
  "records.$ANY.input.redis_functions.$ANY.value.data",
  "records.$ANY.input.redis_functions.$ANY.value.vars.$ANY.data",
  "records.$ANY.input.redis_functions.$ANY.value.default.data",
  "records.$ANY.output.format_function.$ANY.value.data",
  "records.$ANY.output.format_function.$ANY.value.vars.$ANY.data",
  "records.$ANY.output.format_function.$ANY.value.default.data",
  "records.$ANY.output.redis_functions.$ANY.value.data",
  "records.$ANY.output.redis_functions.$ANY.value.vars.$ANY.data",
  "records.$ANY.output.redis_functions.$ANY.value.default.data",
  "app.request.headers.$ANY.data",
  "app.request.query.$ANY.data",
  "app.request.body.$ANY.data",
  "app_action.request.headers.$ANY.data",
  "app_action.request.query.$ANY.data",
  "app_action.request.body.$ANY.data",
]

// Proto types map
const JSON_SIMPLE_TYPE_TO_PROTO_KIND_MAP = {
  [typeof 0]: "numberValue",
  [typeof ""]: "stringValue",
  [typeof false]: "boolValue",
}

/**
 * jsonToStructProto Takes an JSON object with regular JSON object structure,
 * and recursively format it to google.protobuf.Struct structure.
 *
 * @param {object} json
 */
const jsonToStructProto = (json) => {
  // define fields object
  const fields = {}

  // looping over the json and go back to jsonValueToProto
  for (const k in json) {
    fields[k] = jsonValueToProto(json[k])
  }

  // return formatted fields
  return { fields }
}

/**
 * jsonValueToProto Takes an JSON object with regular JSON object structure,
 * and recursively format it to google.protobuf.Value structure.
 *
 * @param {object} value
 */
const jsonValueToProto = (value) => {
  // define valueProto object
  const valueProto = {}

  // checks object type and format
  // it by it
  if (value === null) {
    // attach null value to kind
    valueProto.kind = "nullValue"

    // attach null value to value
    valueProto.nullValue = "NULL_VALUE"

  } else if (value instanceof Array) {
    // attach list value to kind
    valueProto.kind = "listValue"

    // attach list value to value
    valueProto.listValue = {
      values: value.map(jsonValueToProto)
    }

  } else if (typeof value === "object") {
    // attach struct value to kind
    valueProto.kind = "structValue"

    // format json to struct and attach to value
    valueProto.structValue = jsonToStructProto(value)

  } else if (typeof value in JSON_SIMPLE_TYPE_TO_PROTO_KIND_MAP) {
    // check if type includes in simple-types const
    const kind = JSON_SIMPLE_TYPE_TO_PROTO_KIND_MAP[typeof value]

    // attach oneof simple types to find
    valueProto.kind = kind

    // attach oneof simple types to value
    valueProto[kind] = value

  } else {
    console.warn("Unsupported value type ", typeof value)
  }

  // return formatted object in value proto structure
  return valueProto
}

/**
 * formatPayloadObject takes payload as object, and
 * go nested to each element to make format to google.protobuf.Value.
 *
 * @param {object} payload - payload of object
 * @param {string} nextOp - next op as string
 * @param {Array.<string>} pathToValues - array of keys
 */
const formatPayloadObject = (payload, nextOp, pathToValues) => {
  // check if need to loop on all
  // object keys
  if (pathToValues.length > 1) {

    // should move over all object keys
    if (pathToValues[1] === "$ANY") {

      // loop over all object keys
      Object.keys(payload[nextOp]).forEach(key => {
        const cpPathToValues = [...pathToValues]
        jsonRequestFormatByType(payload[nextOp][key], cpPathToValues.slice(2))
      })
    }
  }

  // else, move to the next object
  jsonRequestFormatByType(payload[nextOp], pathToValues.slice(1))
}

/**
 * formatPayloadArray takes payload as array, and
 * go nested to each element to make format to google.protobuf.Value.
 *
 * @param {object} payload - payload body request
 * @param {string} nextOp - next key
 * @param {Array.<string>} pathToValues - paths to proto.value
 */
const formatPayloadArray = (payload, nextOp, pathToValues) => {
  // validate array length
  if (pathToValues.length > 1) {

    // check if need to loop over all elements in the array
    if (pathToValues[1] === "$ANY") {

      // loop over all elements in the array
      payload[nextOp].forEach(value => {

        // deep copy next paths
        const cpPathToValues = [...pathToValues]

        // go nested for each element
        jsonRequestFormatByType(value, cpPathToValues.slice(2))
      })
    // check if next path is specific array index
    } else if (!isNan(pathToValues[1])) {
      // deep copy next paths
      const cpPathToValues = [...pathToValues]

      // pull specified index
      const arrIndex = parseInt(pathToValues[1])

      // go nested for each element
      jsonRequestFormatByType(payload[nextOp][arrIndex], cpPathToValues.slice(2))
    }
  }
}

/**
 * jsonRequestFormatByType takes request payload and converts
 * payload json object format to to json includes
 * google.protobuf.Value attributes.
 *
 * @param {object} payload - payload request object
 * @param {string} endpointPath - endpoint path
 */
const jsonRequestFormatByType = (payload, pathToValues) => {
  // pull nextOp key
  const nextOp = pathToValues[0]

  // stop condition - last element in path
  if (pathToValues.length === 1) {
    // At the end of the recursion,
    // we have reached the value that needs to be formatted
    // from regular json to google.protobuf.Value
    payload[nextOp] = jsonValueToProto(payload[nextOp])

    // End recursion
    return
  }

  // format payload by type
  // check if instance of object
  if (typeof payload[nextOp] === "object") {

    // format object payload
    formatPayloadObject(payload, nextOp, pathToValues)

    // check if instance of array
  } else if (payload[nextOp] instanceof Array) {

    // format array payload
    formatPayloadArray(payload, nextOp, pathToValues)
  }
}

/**
 * jsonRequestToProto loop over paths to
 * google.protobuf.Value and convert it to regular
 * json using jsonRequestFormatByType function.
 *
 * @param {object} payload
 * @returns {object} - formatted payload
 */
const jsonRequestToProto = (payload) => {
  // for each path to google.protobuf.Value,
  // execute the format function.
  PATHS_TO_PROTO_VALUES.forEach(path => {
    jsonRequestFormatByType(payload, path.split("."))
  })

  // return payload after format
  return payload
}

/**
 * jsonRequestToProxy format the request json
 * to fit the structure proxy can handle.
 *
 * @param {object} payload - payload request body
 * @param {object} def - proto service definition.
 */
const jsonRequestToProxy = (payload, def) => {
  // get base proto msg
  const baseProtoMsg = def.requestSerialize(payload).toString("hex")

  // genereate hex prefix
  const pad = "00000000"
  const n = (baseProtoMsg.length / 2).toString(16)
  const prefix = "00" + (pad+n).slice(-pad.length)

  // return proxy request
  return prefix + baseProtoMsg
}

/**
 * formatRequest converts payload json object format
 * to to json includes google.protobuf.Value attributes.
 *
 * @param {object|Array.<object>} payload - payload before format
 * @param {object} def - proto service definition.
 * @return {object|Array.<object>} formatted payload response
 */
module.exports.formatRequest = (payload, def) => {
  // format all google.protobuf.Value
  // payload attributes to json structure
  const payloadAsProto = jsonRequestToProto(payload)

  // format request to fit frontend-proxy
  // structure requests body
  return jsonRequestToProxy(payloadAsProto, def)
}