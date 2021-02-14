const { declare } = require("@releai/helper-plugin-utils")

/**
 * Export default plugin callback
 */
module.exports = declare((api) => {
	api.translation.list.on("success", (payload) => {
		console.log("here", payload)
	})

	return api
})
