const path = require("path")
const grpc = require("grpc")
const { loadSync } = require("@grpc/proto-loader")

module.exports = {
  // frontend proxy URL
  FRONTEND_PROXY: process.env.NODE_ENV === "development"
    ? "frontend-proxy.dev.bot.rele.ai"
    : "frontend-proxy.prod.bot.rele.ai",

  /**
   * Load proto file.
   *
   * @param {string} packageName - Proto package name.
   */
  loadProto(packageName) {
    // load proto file
    const def = loadSync(
      path.join(__dirname, "..", "files", "proto", `${packageName}.proto`),
      {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: false,
        oneofs: true
      }
    )

    // get package bu def
    return grpc.loadPackageDefinition(def)[packageName]
  }
}
