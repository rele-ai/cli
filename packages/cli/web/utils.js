const AuthClient = require("../lib/auth")

module.exports.validateCode = (token) => {
    // check existing token
    if (token) {
        try {
            return new AuthClient().generateRefreshToken(token)
        } catch (err) {
            console.error("unable to get refresh token", err)
            return null
        }
    }

    // no token found
    return null
}