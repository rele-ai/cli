const BaseClient = require("../utils/base")

/**
 * Auth service client.
 */
class AuthClient extends BaseClient {
  /**
   * Initiate the base client with auth proto
   */
  constructor() {
    super("auth")
  }

  /**
   * Generates refresh token via the auth api.
   *
   * @param {string} code - User's auth code.
   * @returns {object} - Refresh and access token.
   */
  generateRefreshToken(code) {
    return this._request(
      this.proto.Authentication.service.GetRefreshToken,
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
      this.proto.Authentication.service.ExchangeRefreshToken,
      {
        refresh_token: refreshToken
      }
    )
  }
}

// Export the auth client
module.exports = AuthClient
