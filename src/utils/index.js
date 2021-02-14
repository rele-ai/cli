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

/**
 * Sort array of configurations by types
 * according to importance.
 * 1. app, workflow, translation
 * 2. app_action
 * 3. operation
 *
 * @param {Array.<object>} data - configs as array of objects
 * @param {Array.<object>} - sorted by types
 */
module.exports.sortByTypes = (data) => {
  const orders = {
    App: 0,
    Workflow: 1,
    Translation: 2,
    AppAction: 3,
    Operation: 4
  }

  return data.sort(
    (a,b) => (orders[a.type] > orders[b.type]) ? 1 : ((orders[b.type] > orders[a.type]) ? -1 : 0)
  )
}