const BaseClient = require("../utils/base")
const { NotifyRequest } = require("../pb/integratedapp_pb")
const { IntegratedAppsService } = require("../pb/integratedapp_grpc_pb")
const googleProtobufStructPb = require("google-protobuf/google/protobuf/struct_pb.js")

/**
 * Auth service client.
 */
class AuthClient extends BaseClient {
  /**
   * Initiate the base client with auth proto
   */
  constructor() {
    super()
  }

  /**
   * Genereric notify request to auth service
   *
   * @param {string} operationKey - operation identifier
   * @param {Object} payload - payload request.
   */
  async notify(operationKey, payload) {
    // init notify request
    const notiftReq = new NotifyRequest()
    notiftReq.setOperationKey(operationKey)
    notiftReq.setPayload(googleProtobufStructPb.Struct.fromJavaScript(payload))

    const res = await this._request(
      IntegratedAppsService.notify,
      notiftReq,
      {
        headers: {
          "x-proxy-cluster": "auth"
        }
      }
    )

    // pull response and return it
    const payloadRes = res.getPayload()
    return payloadRes ? payloadRes.toJavaScript() : {}
  }
}

// Export the auth client
module.exports = AuthClient
