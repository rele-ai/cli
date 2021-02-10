/**
 * Flatten array
 *
 * @param {Array} arr - array to flatten
 */
module.exports.flatten = (arr) => {
  return arr.reduce((flat, toFlatten) => {
    return flat.concat(Array.isArray(toFlatten) ? this.flatten(toFlatten) : toFlatten)
  }, [])
}