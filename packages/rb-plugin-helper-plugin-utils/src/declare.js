
/**
 * Export the declare helper
 */
module.exports = (plugin) => () => {
  const api = {
    translation: {
      // list of callbacks
      callbacks: [],

      // append on create callback
      onList(cb) {
        this.callbacks.push(cb)
      },

      _execute(payload) {
        this.callbacks.forEach((fn) => fn(payload))
      }
    }
  }

  // run the plugin
  plugin(api)

  // return api
  return api
}
