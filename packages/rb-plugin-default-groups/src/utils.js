/**
 * Check if filter is correct.
 *
 * @param {Array.<string>} filter - Filter data.
 * @returns {boolean}
 */
module.exports.checkFilter = ([a, condition, b]) => {
    switch (condition) {
        case "==":
            return a === b
        case "!=":
            return a !== b
        default:
            throw new Error("unexpected condition")
    }
}
