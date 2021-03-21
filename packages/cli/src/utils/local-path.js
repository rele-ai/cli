const path = require("path")

module.exports = {
    /**
     * Check if the string is local path.
     *
     * @param {string} p - A given path.
     * @returns {boolean} - If path is local.
     */
    isLocalPath(p) {
        return /^[./]|(^[a-zA-Z]:)/.test(p)
    },


    /**
     * Returns the normalized path of the template.
     *
     * @param {string} p - A given template path.
     * @returns {string} - Normalized path.
     */
    getTemplatePath(p) {
        return path.isAbsolute(p)
            ? p
            : path.normalize(path.join(process.cwd(), p))
    }
}
