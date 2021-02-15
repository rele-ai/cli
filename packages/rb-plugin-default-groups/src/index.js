const { declare } = require("@releai/helper-plugin-utils")

/**
 * Destruct given groups into matching objects.
 *
 * @param {object} payload - Command payload.
 * @returns {Array.<object>}
 */
const destructGroups = (payload) => {
	if (payload.configs) {
		return payload.configs.flatMap((doc) => {
			switch (doc.type) {
				case "app_action":
					return destructAppActions(doc)
				case "operation":
					return destructOperations(doc)
				default:
					return doc
			}
		})
	} else {
		throw new Error("unable to destruct groups. missing payload config")
	}
}

/**
 * Destruct given app actions into matching objects.
 *
 * @param {object} doc - Config document.
 */
const destructAppActions = (doc) => {
	console.log("destruct app action", doc)
}

/**
 * Destruct given operations into matching objects.
 *
 * @param {object} doc - Config document.
 */
const destructOperations = (doc) => {
	console.log("destruct operation", doc)
}

/**
 * Group app actions objects into a single config.
 *
 * @param {object} payload - Command payload.
 */
const groupAppActions = (payload) => {
	console.log("group app action", payload)
}

/**
 * Group operation objects into a single config.
 *
 * @param {object} payload - Command payload.
 */
const groupOperations = (payload) => {
	console.log("group operations", payload)
}

/**
 * Export default plugin callback
 */
module.exports = declare((api) => {
	// example
	api.translation.list.on("load", (payload) => {
		console.log("payload from list before write", payload)
	})

	// handler group destructuring on apply
	api.apply.on("load", destructGroups)

	// handler group structuing on list
	api.app_action.list.on("load", groupAppActions)
	api.operation.list.on("load", groupOperations)

	// return api
	return api
})
