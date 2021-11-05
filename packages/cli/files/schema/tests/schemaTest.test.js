const Ajv = require("ajv")
const fs = require("fs")
const path = require("path")
const ajvFormats = require("ajv-formats")

/**
 * Reload the schema and validate the json object
 * @param {string} schemaName
 * @param {string} schema json path
 * @param {object} mockData schema to be tested
 */
const applySchema = (schemaName, schema, mockData = {}) => {
  // init ajv
  const env = new Ajv({
    coerceTypes: true,
    useDefaults: true,
    removeAdditional: true,
    allowUnionTypes: true
  })

  // apply ajv formats
  ajvFormats(env)

  // define base schema
  let data = {
    "selector": {
      "workflow": ["test_2"],
      "app": "whatsapp",
      // "app_action": "send_message"
      "app_action": "send_menu_message"
      // "app_action": "send_menu_buttons"
    },
    "output": {
      "operation_type": "drop_session"
    },
    "is_root": true,
    "key": "talma_2",
    "type": "Operation",
    ...mockData
  }

  // load schema and append to ajv
  const schemaObj = JSON.parse(fs.readFileSync(path.join(__dirname, `../${schema}`), 'utf8'))
  console.log(JSON.stringify(schemaObj))
  env.addSchema(schemaObj, schemaName)

  // return validation result
  return env.getSchema(schemaName)(data)
}

describe("Testing the schemas", () => {

  // test("Should success validating the operation Schetruema", () => {
  //   let mockOperation = {
  //     "input": {
  //       "redis_functions": [ { "path": "test", "payload" : { "data": "33", "type": "redis" }}]
  //     }
  //   }
  //   expect(applySchema('operation', 'operations.json', mockOperation)).toBe(true)
  // })

  // test("Should success validating the operation Schema", () => {
  //   expect(applySchema('operation', 'operations.json')).toBe(true)
  // })

  // test("Should failed validating the operation Schema", () => {
  //   let mockOperation = {
  //     "input": {
  //       "redis_functions": ["d", { "data": "", "type": "gal" }]
  //     }
  //   }
  //   expect(applySchema('operation', 'operations.json', mockOperation)).toBe(false)
  // })

  // test("Should success validating the operation Schema", () => {
  //   let mockOperation = {
  //     "redis": {
  //       "data": "5",
  //       "type": "5"
  //     }
  //   }
  //   expect(applySchema('operation', 'operations.json', mockOperation)).toBe(true)
  // })
  // test("Should success validating the operation Schema", () => {
  //   let mockOperation = {
  //       payload: {
  //           content: {
  //             data: "a",
  //             type: "raw"
  //           }
  //         // actions: {
  //         //   type: "raw",
  //         //   data: [
  //         //     { "title": "gal",
  //         //       "items" : [
  //         //         { "title" : "gal", "description": "gal" },
  //         //         { "title" : "gal", "description": "gal" }
  //         //         ]
  //         //     }]
  //         // }
  //       }
  //   }
  //   expect(applySchema('operation', 'operations.json', mockOperation)).toBe(true)
  // })
  test("Should success validating the operation Schema", () => {
    let mockOperation = {
        payload: {
          actions: {
            type: "raw",
            data: [
              { "title": "gal",
                "items" : [
                  { "title" : "gal", "description": "gal" },
                  { "title" : "gal", "description": "gal" }
                  ]
              }]
          }
        }}
    expect(applySchema('operation', 'operations.json', mockOperation)).toBe(true)
  })
})
