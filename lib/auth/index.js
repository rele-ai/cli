const axios = require("axios")
const { loadProto, FRONTEND_PROXY } = require("../utils")

const proto = loadProto("auth")

class AuthClient {
  /**
   * Make a request to the auth service over frontend proxy.
   *
   * @param {object} def - Proto service definition.
   * @param {object} body - Request body.
   */
  _request(def, body) {
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
        },
        responseType: "text"
      }
    ).then((res) => {
      // get response body
      let buf = Buffer.from(res.data, "base64")
      buf = buf.slice(5, parseInt(buf.slice(1,5).toString("hex"), 16) + 5)

      // decode
      return def.responseDeserialize(buf)
    })
  }

  /**
   * Generates refresh token via the auth api.
   *
   * @param {string} code - User's auth code.
   * @returns {object} - Refresh and access token.
   */
  generateRefreshToken(code) {
    return this._request(
      proto.Authentication.service.GetRefreshToken,
      {
        code
      }
    )
  }

  /**
   * Exchange refresh token for access token
   * through the API.
   *
   * @param {string} refreshToken - Refresh token.
   */
  exchangeRefreshForAccess(refreshToken) {
    return this._request(
      proto.Authentication.service.ExchangeRefreshToken,
      {
        refresh_token: refreshToken
      }
    )
  }
}

// Export the auth client
module.exports = AuthClient
