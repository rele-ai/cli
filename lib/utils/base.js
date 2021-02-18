const { proxyClient } = require("./proxy-client")
const { formatResponse } = require("./response")
const { formatRequest } = require("./request")
const { loadProto, FRONTEND_PROXY } = require("./index")

/**
* Define a global base client for rele.ai internal services
*/
class BaseClient {
  /**
  * Initiate base client
  *
  * @param {string} protoName - Proto package name.
  */
  constructor(protoName) {
    // load the client proto
    this.proto = loadProto(protoName)
  }

  /**
  * Make a generic request to the internal services
  * through frontend-proxy.
  *
  * @param {object} def - Proto service definition.
  * @param {object} body - Request payload.
  * @param {object} configs - Request configs.
  */
  async _request(def, body, configs = {}) {
    // format request
    const formattedBody = formatRequest(body, def.path)

    // get base proto msg
    const baseProtoMsg = def.requestSerialize(formattedBody).toString("hex")

    // genereate hex prefix
    const pad = "00000000"
    const n = (baseProtoMsg.length / 2).toString(16)
    const prefix = "00" + (pad+n).slice(-pad.length)

    // make axios request
    return proxyClient.post(
      `https://${FRONTEND_PROXY}${def.path}`,
      Buffer.from(prefix + baseProtoMsg, "hex").toString("base64"),
      {
        headers: {
          "content-type": "application/grpc-web-text",
          "accept": "application/grpc-web-text",
          ...(configs.headers || {}),
        },
        responseType: "text"
      }
      ).then((buf) => {
        // decode response
        const decodedRes = def.responseDeserialize(buf)

        // format decoded response
        // using protobuf formatter
        return formatResponse(decodedRes, def.originalName)
      }
    )
  }
}


module.exports = BaseClient