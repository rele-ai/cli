const utils = require("./utils")
const converters = require("./converters")
const { declare } = require("@releai/helper-plugin-utils")

/**
 * Destruct given groups into matching objects.
 *
 * @param {object} payload - Command payload.
 * @param {object} metadata - Additional required resources.
 * @returns {Array.<object>}
 */
const destructGroups = async (payload, metadata) => {
	if (payload.yamlData) {
		// destruct all operations and collect promises
		const promises = payload.yamlData.map(async (doc) => {
			switch (doc.type) {
				case "Operation":
					return await destructOperations(doc, metadata)
				default:
					return doc
			}
		})

		// update paylaod yaml data
		payload.yamlData = (await Promise.all(promises)).flat()
	} else {
		throw new Error("unable to destruct groups. missing payload config")
	}
}

/**
 * Destruct given operations into matching objects.
 *
 * @param {object} doc - Config document.
 * @param {object} metadata - Additional required resources.
 */
const destructOperations = async (doc, metadata) => {
	// get group
	const group = (await converters(doc, metadata)).find((g) => g.filters.reduce((filter => utils.checkFilter(filter))))

	// check if group exists
	if (group) {
		return group.convert_with
	} else {
		return doc
	}
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
	// handler group destructuring on apply
	api.apply.on("load", destructGroups)

	// handler group structuing on list
	api.app_action.list.on("load", groupAppActions)
	api.operation.list.on("load", groupOperations)

	// return api
	return api
})
