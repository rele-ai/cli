// JSON simple value consts
const JSON_SIMPLE_VALUE_KINDS = new Set([
  "numberValue",
  "stringValue",
  "boolValue",
])

// Proto Types
const TYPES = [
  "structValue",
  "listValue",
  "nullValue",
  "numberValue",
  "boolValue",
  "stringValue"
]

/**
 * Format struct proto type to JSON
 *
 * @param {object} proto
 */
const structProtoToJson = (proto) => {
  if (!proto || !proto.fields) {
    return {}
  }
  const json = {}
  for (const k in proto.fields) {
    json[k] = valueProtoToJson(proto.fields[k])
  }
  return json
}

/**
 * Format value proto type to JSON
 *
 * @param {object} proto
 */
const valueProtoToJson = (proto) => {
  if (!proto || !proto.kind) {
    return null
  }

  if (JSON_SIMPLE_VALUE_KINDS.has(proto.kind)) {
    return proto[proto.kind]
  } else if (proto.kind === "nullValue") {
    return null
  } else if (proto.kind === "listValue") {
    return proto.listValue.values.map(valueProtoToJson)
  } else if (proto.kind === "structValue") {
    return structProtoToJson(proto.structValue)
  } else {
    return null
  }
}

/**
 * Format list of objects, by using formatValue
 * if nessesary.
 *
 * @param {object} payload - payload before format.
 */
const formatList = (payload) => {
  // pull value
  const [listValue] = Object.values(payload) || []

  // pull key
  const [keyType] = Object.keys(payload) || ""

  if (Array.isArray(listValue)) {
    return {
      [keyType]: listValue.map(value => formatValue(value))
    }
  } else {
    return payload
  }
}

/**
 * Format to struct proto value if structure matches.
 * otherwise, return regular object.
 *
 * @param {object} payload - object payload before format
 * @return {Object} - formatted object
 */
const formatValue = (payload) => {
  Object.keys(payload || {}).forEach(key => {
    // pull kind
    const kind = payload[key].kind

    // check if payload.key
    // is instance of proto value
    if (payload[key].kind && TYPES.includes(payload[key].kind)) {
      payload[key] = valueProtoToJson(payload[key])
    }

    // go nested
    if (typeof payload[key] === "object") {
      formatValue(payload[key])
    }
  })

  // return formatted object
  return payload
}

/**
 * formatResponse converts the response
 * to json format from the value format if necessary.
 *
 * @param {object|Array.<object>} payload - payload before format
 * @param {string} endpointName - name of endpoint response
 * @return {object|Array.<object>} formatted payload response
 */
module.exports.formatResponse = (payload, endpointName) => {
  // formatted payload response
  let formattedPayload = {}

  // format payload by endpoint type
  switch (endpointName) {
  case "list":
    formattedPayload = formatList(payload)
    break
  case "get":
  case "create":
  case "delete":
  case "update":
    formattedPayload = formatValue(payload)
    break
  default:
    formattedPayload = payload
  }

  // return fornatted payload
  return formattedPayload
}
