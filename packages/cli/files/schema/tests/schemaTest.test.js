const jjv = require("jjv")
const env = jjv();
const fs = require("fs")
const path = require("path")

/**
 * Reload the schema and validate the json object
 * @param {string} schemaName
 * @param {string} schema json path
 * @param {object} mockData schema to be tested
 */
const applySchema = (schemaName, schema, mockData = {}) => {
  let data = {
    "selector": {
      "workflow": ["test"],
      "app": "whatsapp",
      "app_action": "send_message"
    },
    "key": "testKey",
    "type": "Operation",
    ...mockData
  }
  const schemaObj = JSON.parse(fs.readFileSync(path.join(__dirname, `../${schema}`), 'utf8'))
  env.addSchema(schemaName, schemaObj)
  return env.validate(schemaName, data)
}

describe("Testing the schemas", () => {

  test("Should success validating the operation Schema", () => {
    let mockOperation = {
      "input": {
        "redis_functions": ["d", { "data": "33", "type": "gal" }]
      }
    }
    expect(applySchema('operation', 'operations.json', mockOperation)).toBe(null)
  })

  test("Should success validating the operation Schema", () => {
    expect(applySchema('operation', 'operations.json')).toBe(null)
  })

  test("Should failed validating the operation Schema", () => {
    let mockOperation = {
      "input": {
        "redis_functions": ["d", { "data": "", "type": "gal" }]
      }
    }
    expect(applySchema('operation', 'operations.json', mockOperation)).not.toBe(null)
  })

  test("Should success validating the operation Schema", () => {
    let mockOperation = {
      "redis": {
        "data": "5",
        "type": "5"
      }
    }
    expect(applySchema('operation', 'operations.json', mockOperation)).toBe(null)
  })
})
