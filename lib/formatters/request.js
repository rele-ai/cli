// Endpoint that includes proto values
ENDPOINTS_INCLUDES_VALUES = [
  "/components.Operations/Create",
  "/components.Operations/Update"
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
 * Format input && output functions to value proto.
 *
 * @param {object} inputOutput
 */
const formatInputOuput = (inputOutput = {}) => {
  // extract functions
  const { format_function = [], redis_functions = [] } = inputOutput

  // input && output - loop over format functions and extact proto value
  format_function.forEach((func) => {
    if (((func || {}).value || {}).data) {
      func.value.data = jsonValueToProto(func.value.data)
    }
  })

  // input && output - loop over redis functions and extact proto value
  redis_functions.forEach((func) => {
    if (((func || {}).value || {}).data) {
      func.value.data = jsonValueToProto(func.value.data)
    }
  })
}

/**
 * jsonRequestToProto takes request payload and converts
 * payload json object format to to json includes
 * google.protobuf.Value attributes.
 *
 * @param {object} payload - payload request object
 * @param {string} endpointPath - endpoint path
 */
const jsonRequestToProto = (payload, endpointPath) => {
  if (ENDPOINTS_INCLUDES_VALUES.includes(endpointPath)) {
    // destract operation
    const { operation = {} } = payload

    // loop over payload keys and extract proto value
    Object.keys(operation.payload || {}).forEach(key => {
      operation.payload[key].data = jsonValueToProto(operation.payload[key].data)
    })

    // format input functions to value proto
    formatInputOuput(operation.input)

    // format output functions to value proto
    formatInputOuput(operation.output)
  }

  // return json request after
  // proto format
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
  const payloadAsProto = jsonRequestToProto(payload, def.path)

  // format request to fit frontend-proxy
  // structure requests body
  return jsonRequestToProxy(payloadAsProto, def)
}