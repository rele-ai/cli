const axios = require("axios")
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
  _request(def, body, configs) {
    // get base proto msg
    const baseProtoMsg = def.requestSerialize(body).toString("hex")

    // genereate hex prefix
    const pad = "00000000"
    const n = (baseProtoMsg.length / 2).toString(16)
    const prefix = "00" + (pad+n).slice(-pad.length)

    // make axios request
    return axios.post(
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
      ).then((res) => {
        // get response body
        let buf = Buffer.from(res.data, "base64")
        buf = buf.slice(5, parseInt(buf.slice(1,5).toString("hex"), 16) + 5)

        // decode
        return def.responseDeserialize(buf)
      }
    )
  }
}


module.exports = BaseClient