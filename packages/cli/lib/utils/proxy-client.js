const axios = require("axios")

/**
 * Build the proxy client
 */
const proxyClient = axios.create()

// Define the client proxy response hook
proxyClient.interceptors.response.use(
  (res) => {
    // throw error status code greater than 400
    if (Number(res.headers["grpc-status"]) >= 400) {
      throw new Error(res.headers["grpc-message"] || "unable to execute operation.")
    }

    // get response body
    let buf = Buffer.from(res.data, "base64")
    return buf.slice(5, parseInt(buf.slice(1,5).toString("hex"), 16) + 5)
  }
)

// export proxy client
module.exports.proxyClient = proxyClient