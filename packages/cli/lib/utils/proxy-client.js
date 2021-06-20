const axios = require("axios")

/**
 * Build the proxy client
 */
const proxyClient = axios.create()

// Define the client proxy response hook
proxyClient.interceptors.response.use(
  (res) => {
    // get response body
    let buf = Buffer.from(res.data, "base64")

    // spliced buffer
    buf = buf.slice(5, parseInt(buf.slice(1,5).toString("hex"), 16) + 5)

    // // throw error status code greater than 400
    // if (Number(res.headers["grpc-status"]) >= 400) {
    //   throw new Error(res.headers["grpc-message"] || "unable to execute operation.")
    // }

    // validate response status code
    const responseStatus = getResponseStatusCode(buf.toString())

    if (responseStatus["grpc-status"] >= 400) {
      throw new Error(responseStatus["grpc-message"] || "unable to execute operation.")
    }

    return buf
  }
)


/**
 * getResponseStatusCode takes response buffer and returns the
 * response status code and message
 *
 * @param {Buffer} buf - response buffer
 * @returns {Object} - status code and message
 */
const getResponseStatusCode = (buf) => {
  // response status 200 object
  const validResposne = {
    "grpc-status": 200,
    "grpc-message": ""
  }

  try {
    // format response body to stringify response
    const strRes = JSON.stringify(buf).replace(/["]/g, '').replace(/%20/g, ' ')

    // check if response came back on potential error format
    if (strRes.includes("grpc-status") && strRes.includes("grpc-message")) {

      // build error json
      const parts = strRes.split("\\r\\n")
      const formattedStr = parts.slice(0, -1).join(',') + parts.slice(-1)
      const [status, message] = formattedStr.replace("grpc-status", '"grpc-status"').split('grpc-message:')

      // return the formatted error json
      return JSON.parse(`{${status + '"grpc-message":' + `"${message}"`}}`)
    } else {
      return validResposne
    }
  } catch (e) {
    return validResposne
  }
}

// export proxy client
module.exports.proxyClient = proxyClient