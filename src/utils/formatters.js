/**
 * cleanEmptyFields takes an object
 * and remove from it all empty object fields
 *
 * @param {Object} object
 */
module.exports.cleanEmptyFields = (object) => {
  for (let propName in object) {
    if (typeof(object[propName]) === "object" && Object.keys(object[propName] || {}).length === 0) {
      delete object[propName]
    }
  }

  // return object without empty fields
  return object
}