const axios = require("axios")
const { loadProto, FRONTEND_PROXY } = require("../utils")

const proto = loadProto("auth")

class AuthClient {
  /**
   * Generates refresh token via the auth api.
   *
   * @param {string} code - User's auth code.
   * @returns {object} - Refresh and access token.
   */
  generateRefreshToken(code) {
    // base proto msg
    const baseProtoMsg = proto.Authentication.service.GetRefreshToken.requestSerialize({ code }).toString("hex")

    // generate hex prefix
    const pad = "00000000"
    const n = (baseProtoMsg.length / 2).toString(16)
    const prefix = "00" + (pad+n).slice(-pad.length)

    // make auth request
    return axios.post(
      `https://${FRONTEND_PROXY}/auth.Authentication/GetRefreshToken`,
      Buffer.from(prefix+baseProtoMsg, "hex").toString("base64"),
      {
        headers: {
          "content-type": "application/grpc-web-text",
          "accept": "application/grpc-web-text",
        },
        responseType: "text"
      }
    ).then((res) => {
      // get response body
      let buf = Buffer.from(res.data, "base64")
      buf = buf.slice(5, parseInt(buf.slice(1,5).toString("hex"), 16) + 5)

      // decode
      return proto
        .Authentication
        .service
        .GetRefreshToken
        .responseDeserialize(buf)
    })
  }
}

// Export the auth client
module.exports = AuthClient
