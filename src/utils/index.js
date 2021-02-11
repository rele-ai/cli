/**
* Converts string to snake case.
*
* @param {string} str - Camel case string.
* @returns {string} - As snake case
*/
module.exports.toSnakeCase = (str) => {
  return str.replace(
    /(?:^|\.?)([A-Z])/g,
    (x,y) => "_" + y.toLowerCase()
  ).replace(/^_/, "")
}

/**
 * Converts list of objects to map.
 *
 * @param {Array.<object>} docs - List of firestore objects.
 * @returns {object} - Mapped data.
 */
module.exports.docListToObj = (docs) => {
  let data = {}

  // map data
  docs.forEach((doc) => {
    data[doc.id] = doc
  })

  return data
}
