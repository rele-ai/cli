const AuthClient = require("../lib/auth")

module.exports.validateCode = (code) => {
    // check existing code
    if (code) {
        try {
            return new AuthClient().notify("get_refresh_token", { code })
        } catch (err) {
            console.error("unable to get refresh token", err)
            return null
        }
    }

    // no token found
    return null
}