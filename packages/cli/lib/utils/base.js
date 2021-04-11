const { proxyClient } = require("./proxy-client")
const { formatResponse } = require("../formatters/response")
const { formatRequest } = require("../formatters/request")
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
    if (protoName) {
      this.proto = loadProto(protoName)
    }
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
    const formattedBody = formatRequest(body, def)

    // make axios request
    return proxyClient.post(
      `https://${FRONTEND_PROXY}${def.path}`,
      Buffer.from(formattedBody, "hex").toString("base64"),
      {
        headers: {
          "content-type": "application/grpc-web-text",
          "accept": "application/grpc-web-text",
          ...(configs.headers || {}),
        },
        responseType: "text"
      }
      ).then((buf) => {
        // format buffer response
        // using protobuf formatter
        return formatResponse(buf, def)
      }
    )
  }
}


module.exports = BaseClient