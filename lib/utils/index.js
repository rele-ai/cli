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
      path.join(__dirname, "..", "..", "files", "proto", `${packageName}.proto`),
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
  },

  /**
   * Convert text to pascal case.
   *
   * @param {string} str - A text.
   */
  toPascalCase(string) {
    return `${string}`
      .replace(new RegExp(/[-_]+/, 'g'), ' ')
      .replace(new RegExp(/[^\w\s]/, 'g'), '')
      .replace(
        new RegExp(/\s+(.)(\w+)/, 'g'),
        ($1, $2, $3) => `${$2.toUpperCase() + $3.toLowerCase()}`
      )
      .replace(new RegExp(/\s/, 'g'), '')
      .replace(new RegExp(/\w/), s => s.toUpperCase());
  },

  /**
   * Convert data to bytes.
   *
   * @param {*} data - data to conver to bytes
   */
  toBytes(data) {
    if (data) {
      switch (data.constructor) {
      case Array:
      case Number:
      case String:
      case Object:
        data = JSON.stringify(data)
        return Buffer.from(data)
      default:
        throw new Error("unsupporeted type")
      }
    }
  }
}
