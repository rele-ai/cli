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
	const group = (await converters(doc, metadata)).find(g => {
		// check if all filters matches
		const filterMatcher = g.filters.map(filter => {
			return utils.checkFilter(filter)
		})

		// if not include false, there is a match
		return !filterMatcher.includes(false)
	})

	// check if group exists
	if (group) {
		return group.ungroup
	} else {
		return doc
	}
}

/**
 * Group operation objects into a single config.
 *
 * @param {object} payload - Command payload.
 */
const groupOperations = async (payload, metadata) => {
	const operationsAsMap = utils.configAsMapByKey(payload.operations)

	// check if operations exists
	if (payload.operations && payload.operations.length) {
		// group all operations
		const promises = payload.operations.map(async (doc) => {
			// get group
			const group = (await converters(doc, metadata)).find((g) => g.filters.reduce((filter => utils.checkFilter(filter))))

			// check if group exists
			if (group) {
				// get all relevant operations by next_operation __rb_internal
				const operationsToGroup = utils.getOperationsToGroup(doc, operationsAsMap)

				// return grouped document
				return group.group(operationsToGroup)
			} else if (doc.key.startsWith("__rb_internal")) {
				return null
			} else {
				return doc
			}
		})

		// pudate the operations payload
		payload.operations = (await Promise.all(promises)).flat().filter(elem => !!elem)
	}
}

/**
 * Export default plugin callback
 */
module.exports = declare((api) => {
	// handler group destructuring on apply
	api.apply.on("load", destructGroups)

	// handler group destructuring on delete
	api.delete.on("load", destructGroups)

	// handler group structuing on list
	api.operation.list.on("load", groupOperations)

	// return api
	return api
})
