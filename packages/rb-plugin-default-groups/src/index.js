const { declare } = require("@releai/helper-plugin-utils")

/**
 * Export default plugin callback
 */
module.exports = declare((api) => {
	api.translation.onList((payload) => {
		console.log("here", payload)
	})

	return api
})
