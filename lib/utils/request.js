// Endpoint that includes proto values
ENDPOINTS_INCLUDES_VALUES = [
  "/components.Operations/Create"
]

// Proto types map
const JSON_SIMPLE_TYPE_TO_PROTO_KIND_MAP = {
  [typeof 0]: "numberValue",
  [typeof ""]: "stringValue",
  [typeof false]: "boolValue",
}

/**
 * Format json to Struct proto structure.
 *
 * @param {object} json
 */
const jsonToStructProto = (json) => {
  const fields = {}
  for (const k in json) {
    fields[k] = jsonValueToProto(json[k])
  }

  return { fields }
}

/**
 * Format json to Value proto structure.
 *
 * @param {object} value
 */
const jsonValueToProto = (value) => {
  const valueProto = {}

  if (value === null) {
    valueProto.kind = "nullValue"
    valueProto.nullValue = "NULL_VALUE"
  } else if (value instanceof Array) {
    valueProto.kind = "listValue"
    valueProto.listValue = {values: value.map(jsonValueToProto)}
  } else if (typeof value === "object") {
    valueProto.kind = "structValue"
    valueProto.structValue = jsonToStructProto(value)
  } else if (typeof value in JSON_SIMPLE_TYPE_TO_PROTO_KIND_MAP) {
    const kind = JSON_SIMPLE_TYPE_TO_PROTO_KIND_MAP[typeof value]
    valueProto.kind = kind
    valueProto[kind] = value
  } else {
    console.warn("Unsupported value type ", typeof value)
  }
  return valueProto
}

/**
 * Format input && output functions to value proto.
 *
 * @param {object} inputOutput
 */
const formatInputOuput = (inputOutput = {}) => {
  // extract functions
  console.log(inputOutput)
  const { format_function = [], redis_functions = [] } = inputOutput

  // input && output - loop over format functions and extact proto value
  format_function.forEach(func => {
    func.value = jsonValueToProto(func.value)
  })

  // input && output - loop over redis functions and extact proto value
  redis_functions.forEach(func => {
    func.value = jsonValueToProto(func.value)
  })
}

/**
 * formatRequest converts payload json object format
 * to to json includes proto.value structre attributes.
 *
 * @param {object|Array.<object>} payload - payload before format
 * @param {object} endpointPath - endpoint's path from proto defenition.
 * @return {object|Array.<object>} formatted payload response
 */
module.exports.formatRequest = (payload, endpointPath) => {
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

  return payload
}