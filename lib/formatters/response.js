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
 * structProtoToJson Takes an JSON object, and recursively checks
 * if it have any objects with google.protobuf.Struct structure. If the
 * function find any values, it will format it to regular json structure.
 *
 * @param {object} proto
 */
const structProtoToJson = (proto) => {
  // validate that object is in
  // google.protobuf.Struct structure
  if (!proto || !proto.fields) {
    return {}
  }

  // define json object
  const json = {}

  // loop over fields and go into valueProtoToJson
  // for recursive check the object type and format
  // it if needed
  for (const k in proto.fields) {
    json[k] = valueProtoToJson(proto.fields[k])
  }

  // return formatted object
  // from google.protobuf.Struct to json
  return json
}

/**
 * valueProtoToJson Takes an JSON object, and recursively checks
 * if it have any objects with google.protobuf.Value structure. If the
 * function find any values, it will format it to regular json structure.
 *
 * @param {object} proto
 */
const valueProtoToJson = (proto) => {
  // validate that the object is in
  // google.protobuf.Value structure
  if (!proto || !proto.kind) {
    return null
  }

  // pull value by proto type
  if (JSON_SIMPLE_VALUE_KINDS.has(proto.kind)) {
    // checks if kind is oneof proto simple types
    // and return the simple value
    return proto[proto.kind]

  // checks if the object should be null
  } else if (proto.kind === "nullValue") {

    // return nullable value
    return null

    // checks object should be list
  } else if (proto.kind === "listValue") {

    // return list value
    return proto.listValue.values.map(valueProtoToJson)

    // checks if object should be google.protobuf.Struct
  } else if (proto.kind === "structValue") {

    // build struct value and return it
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
    if (kind && TYPES.includes(kind)) {
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
 * protoRequestToJson converts the response
 * to json in google.protobuf.Value to regulat json format.
 *
 * @param {Object} payload - payload response object
 * @param {string} endpointOriginalName - endpoint original name
 */
const protoRequestToJson = (payload, endpointOriginalName) => {
  // formatted payload response
  let formattedPayload = {}

  // format payload by endpoint type
  switch (endpointOriginalName) {
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

/**
 * formatResponse converts the response
 * to json in google.protobuf.Value to regulat json format.
 *
 * @param {Buffer} payloadBuf - payload as buffer
 * @param {object} def - proto service definition
 * @returns {object} - formatted response as json
 */
module.exports.formatResponse = (payloadBuf, def) => {
  // decode response
  const decodedRes = def.responseDeserialize(payloadBuf)

  // return formatted response as json
  // without any google.protobuf.Value structure attributes.
  return protoRequestToJson(decodedRes, def.originalName)
}
