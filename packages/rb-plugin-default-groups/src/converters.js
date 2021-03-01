const uuidv4 = require("uuid").v4
const { docListToObj } = require("@releai/cli/src/utils")
const { cleanEmptyFields } = require("@releai/cli/src/utils/formatters")
const { WorkflowsClient, OperationsClient, AppActionsClient } = require("@releai/cli/lib/components")

module.exports = async (config, { accessToken }) => {
  const operations = docListToObj((await (new OperationsClient(accessToken).list())))
  const workflows = docListToObj((await (new WorkflowsClient(accessToken).list())))
  const appActions = docListToObj((await (new AppActionsClient(accessToken).list())))

  // define operation map
  const operationsMap = {}

  // build operation map
  Object.values(operations).forEach((operation) => {
    if (!operationsMap[operation.key]) {
      operationsMap[operation.key] = {}
    }

    Object.entries((operation.next_operation || {})).forEach(([workflowId, operationId]) => {
      operationsMap[operation.key][workflows[workflowId].key] = operations[operationId].key
    })

    if (appActions[operation.action.id].operation_key === "switch_condition") {
      Object.keys(operation.payload).forEach(key => {
        if (key.startsWith("case_")) {
          Object.entries((operation.payload[key].next_operation || {})).forEach(([workflowId, operationId]) => {
            operationsMap[operation.key][`${key}_${workflows[workflowId].key}`] = operations[operationId].key
          })
        }
      })
    }
  })

  return [
    // convert send message
    () => {
      const baseOperation = {
        ...config,
        payload: {
          content: (config.payload || {}).content || ""
        },
        next_operation: {
          selector: ((config.next_operation || {}).selector || []).map((selector) => ({
            workflow: selector.workflow,
            operation: (operationsMap[config.key] || {})[selector.workflow] ? operationsMap[config.key][selector.workflow] : `__rb_internal_${uuidv4().replace(/-/g, "_")}_get_notification`
          }))
        },
        output: ((config.next_operation || {}).selector || []).length === 0 ? config.output : {},
        redis: ((config.next_operation || {}).selector || []).length === 0 ? config.redis : {},
      }

      const item = {
        filters: [
          [(config.selector || {}).app_action || "", "==", "send_message"],
          [(config.output || {}).operation_type || "", "!=", "drop_session"]
        ],
        defaults: {
          timeout: {
            data: 60,
            type: "raw"
          }
        },
        ungroup: [
          baseOperation
        ],
        group(operationsToGroup) {
          let payload = {}
          let rootOperation = {}
          let internalOperations = []

          operationsToGroup.forEach((op) => {
            // structure operations
            if (op.key.startsWith("__rb_internal")) {
              internalOperations.push(op)
            } else {
              rootOperation = op
            }

            // build payload
            payload = {
              ...payload,
              ...op.payload
            }
          })

          // return grouped operation
          return cleanEmptyFields({
            type: "Operation",
            selector: rootOperation.selector,
            is_root: rootOperation.is_root,
            next_operation: {
              selector: internalOperations.map((io) => io.next_operation.selector).flat()
            },
            on_error: rootOperation.on_error,
            output: internalOperations.length ? internalOperations[0].output : rootOperation.output,
            input: rootOperation.input,
            redis: internalOperations.length ? internalOperations[0].redis : rootOperation.redis,
            payload,
            key: rootOperation.key
          })
        }
      }

      baseOperation.next_operation.selector.forEach((selector) => {
        const baseNextOp = {
          type: "Operation",
          selector: {
            app: "clara",
            app_action: "get_notification",
            workflow: (config.selector || {}).workflow || []
          },
          is_root: false,
          next_operation: (config.next_operation || {}),
          on_error: (config.on_error || {}),
          output: (config.output || {}),
          input: {},
          redis: (config.redis || {}),
          payload: {
            timeout: config.timeout || item.defaults.timeout
          },
          key: selector.operation
        }

        if (!baseNextOp.redis.field) baseNextOp.redis.field = config.key
        if (!baseNextOp.redis.type) baseNextOp.redis.type = "hash_map"

        item.ungroup.push(baseNextOp)
      })

      return item
    },
    // convert queue messages
    () => {
      const item = {
        filters: [
          [(config.selector || {}).app_action || "", "==", "queue"],
          [(config.selector || {}).app || "", "==", "clara"]
        ],
        defaults: {
          redis: {
            type: "array"
          },
          queue_timeout: {
            data: 5,
            type: "raw"
          }
        },
        group([operation]) {
          let formattedInput = {
            ...(operation.input || {}),
            format_function: ((operation.input || {}).format_function || []).filter(func => {
              return func.operation !== "encode_base64"
            })
          }

          if (!formattedInput.format_function.length) delete formattedInput.format_function

          return cleanEmptyFields({
            type: "Operation",
            selector: operation.selector,
            is_root: operation.is_root,
            output: config.output || {},
            input: formattedInput,
            next_operation: operation.next_operation || {},
            payload: operation.payload,
            key: operation.key,
          })
        }
      }

      const baseOperation = {
        ...config,
        payload: {
          queue_timeout: (config.payload || {}).queue_timeout || item.defaults.queue_timeout
        },
        output: config.output || {},
        input: {
          ...(config.input || {}),
          format_function: [
            ...((config.input || {}).format_function || []),
            {
              operation: "encode_base64",
              output: "messages:messages_b64",
              value: {
                data: "message_data.message",
                type: "request"
              }
            }
          ]
        },
        redis: config.redis || { field: config.key, type: "array" } || {}
      }

      item.ungroup = [baseOperation]

      return item
    },
    () => {
      const item = {
        filters: [
          [(config.selector || {}).app_action || "", "==", "releai_active_integrations"]
        ]
      }

      let isExists = false
      for (const workflowKey in (config.selector || []).workflow || []) {
        if ((operationsMap[config.key] || {})[workflowKey]) {
          isExists = true
          break
        }
      }

      if (isExists) {
        console.log("releai_active_integrations Exists!")
      } else {
        console.log("genereate new items")
        let uuidMap = {}
        for (let i = 1; i <= 16; i++) {
          uuidMap[`rb_internal_key_${i}`] = `__rb_internal_${uuidv4().replace(/-/g, "_")}_releai_active_intergations`
        }

        const baseOperations = [
          // 0 wmTSPt0RLortgvKt1XzP
          {
            type: "Operation",
            selector: {
              workflow: config.selector.workflow,
              app: "clara",
              app_action: "switch_condition"
            },
            is_root: config.is_root || false,
            key: config.key,
            input: {},
            redis: {},
            payload: {
              condition: {
                type: "struct",
                data: "Org.Hubspot.ApiKey"
              },
              case_1: {
                match_operation: "!=",
                data: "",
                next_operation: {
                  selector: config.selector.workflow.map(workflowKey => ({
                    workflow: workflowKey,
                    operation: "rb_internal_key_1"
                  }))
                },
                type: "raw"
              }
            },
            next_operation: {
              selector: config.selector.workflow.map(workflowKey => ({
                workflow: workflowKey,
                operation: "rb_internal_key_3"
              }))
            },
          },
          // 1 Ohj8MzuedAwBriCeSeqA
          {
            type: "Operation",
            selector: {
              workflow: config.selector.workflow,
              app: "clara",
              app_action: "update_session"
            },
            key: "rb_internal_key_1",
            payload: {
              option: {
                type: "raw",
                data: "HubSpot"
              }
            },
            next_operation: {
              selector: config.selector.workflow.map(workflowKey => ({
                workflow: workflowKey,
                operation: "rb_internal_key_2"
              }))
            },
            redis: {
              field: "integration_options",
              type: "array"
            },
            output: {},
          },
          // 2 lifDOcWYsvQPoF9jCJHh
          {
            type: "Operation",
            selector: {
              workflow: config.selector.workflow,
              app: "clara",
              app_action: "update_session"
            },
            key: "rb_internal_key_2",
            redis: {
              field: "integration_options",
              type: "hash_map"
            },
            output: {},
            org: "global",
            input: {
              format_function: [
                {
                  operation: "increment",
                  output: "integration_options:length",
                  args: {
                    amount: 1
                  },
                  value: {
                    default: {
                      data: 0,
                      type: "raw"
                    },
                    data: "integration_options:integration_options:length",
                    type: "redis",
                    rkey_type: "hash_map"
                  }
                }
              ]
            },
            next_operation: {
              selector: config.selector.workflow.map(workflowKey => ({
                workflow: workflowKey,
                operation: "rb_internal_key_3"
              }))
            },
          },
          // 3 APKeOUITJymF6TxMXQbv
          {
            type: "Operation",
            selector: {
              workflow: config.selector.workflow,
              app: "clara",
              app_action: "switch_condition"
            },
            key: "rb_internal_key_3",
            payload: {
            condition: {
              type: "struct",
              vars: {
                org_id: {
                  data: "Org.Id",
                  type: "struct"
                }
              },
              data: "User.Hubspot.$org_id"
            },
              case_1: {
                next_operation: {
                  selector: config.selector.workflow.map(workflowKey => ({
                    workflow: workflowKey,
                    operation: "rb_internal_key_4"
                  }))
                },
                data: "",
                type: "raw",
                match_operation: "!="
              }
            },
            output: {},
            next_operation: {
              selector: config.selector.workflow.map(workflowKey => ({
                workflow: workflowKey,
                operation: "rb_internal_key_5"
              }))
            },
            redis: {}
          },
          // 4 kmkwgDnjYs03tckh0xKe
          {
            type: "Operation",
            selector: {
              workflow: config.selector.workflow,
              app: "clara",
              app_action: "update_session"
            },
            key: "rb_internal_key_4",
            output: {},
            redis: {
              type: "array",
              field: "integration_options"
            },
            next_operation: {
              selector: config.selector.workflow.map(workflowKey => ({
                workflow: workflowKey,
                operation: "rb_internal_key_16"
              }))
            },
            input: {},
            payload: {
              option: {
                data: "HubSpot",
                type: "raw"
              }
            },
          },
          // 5 apxCjjsRN4qL2z1BAOVD
          {
            type: "Operation",
            selector: {
              workflow: config.selector.workflow,
              app: "clara",
              app_action: "switch_condition"
            },
            key: "rb_internal_key_5",
            redis: {},
            payload: {
              case_1: {
                type: "raw",
            next_operation: {
              selector: config.selector.workflow.map(workflowKey => ({
                workflow: workflowKey,
                operation: "rb_internal_key_6"
              }))
            },
              match_operation: ">",
              data: 0
              },
              condition: {
                data: "crm_contact:check_email_integration:results:length",
                rkey_type: "hash_map",
                type: "redis"
              }
            },
            next_operation: {
              selector: config.selector.workflow.map(workflowKey => ({
                workflow: workflowKey,
                operation: "rb_internal_key_8"
              }))
            },
            output: {},
            input: {
              format_function: [
                {
                output: "check_email_integration:results:length",
                operation: "get_length",
                value: {
                  vars: {
                    org_id: {
                      type: "struct",
                      data: "Org.Id"
                    }
                  },
                  type: "struct",
                  data: "User.Mailing.$org_id.Values"
                  }
                }
              ]
            }
          },
          // 6 2e11fnoxvAGurcKr3QBw
          {
            type: "Operation",
            selector: {
              workflow: config.selector.workflow,
              app: "clara",
              app_action: "update_session"
            },
            key: "rb_internal_key_6",
            output: {},
            payload: {
              option: {
                data: "Mailing",
                type: "raw"
              }
            },
            next_operation: {
              selector: config.selector.workflow.map(workflowKey => ({
                workflow: workflowKey,
                operation: "rb_internal_key_7"
              }))
            },
            input: {},
            redis: {
              type: "array",
              field: "integration_options"
            },
          },
          // 7 q5LGP3iQkZFnIfXj8xgl
          {
            type: "Operation",
            selector: {
              workflow: config.selector.workflow,
              app: "clara",
              app_action: "update_session"
            },
            key: "rb_internal_key_7",
            next_operation: {
              selector: config.selector.workflow.map(workflowKey => ({
                workflow: workflowKey,
                operation: "rb_internal_key_8"
              }))
            },
            input: {
              format_function: [
                {
                operation: "increment",
                output: "integration_options:length",
                args: {
                  amount: 1
                },
                value: {
                  default: {
                    data: 0,
                    type: "raw"
                  },
                  data: "integration_options:integration_options:length",
                  type: "redis",
                  rkey_type: "hash_map"
                  }
                }
              ]
            },
            redis: {
            type: "hash_map",
            field: "integration_options"
            },
            output: {}
          },
          // 8 cojkBCspYzPdEV3F54hs
          {
            type: "Operation",
            selector: {
              workflow: config.selector.workflow,
              app: "clara",
              app_action: "switch_condition"
            },
            key: "rb_internal_key_8",
            redis: { },
            payload: {
              case_1: {
              match_operation: "!=",
              type: "raw",
              next_operation: {
                selector: config.selector.workflow.map(workflowKey => ({
                  workflow: workflowKey,
                  operation: "rb_internal_key_9"
                }))
              },
              data: ""
              },
            condition: {
              data: "User.Salesforce.$org_id",
              type: "struct",
              vars: {
                org_id: {
                  type: "struct",
                  data: "Org.Id"
                }
              }
            }
            },
            output: {},
            next_operation: {
              selector: config.selector.workflow.map(workflowKey => ({
                workflow: workflowKey,
                operation: "rb_internal_key_11"
              }))
            },
          },
          // 9 mZpSztQsXIMKBPWDhv9f
          {
            type: "Operation",
            selector: {
              workflow: config.selector.workflow,
              app: "clara",
              app_action: "update_session"
            },
            key: "rb_internal_key_9",
            next_operation: {
              selector: config.selector.workflow.map(workflowKey => ({
                workflow: workflowKey,
                operation: "rb_internal_key_11"
              }))
            },
            output: {},
            redis: {
              type: "array",
              field: "integration_options"
            },
            payload: {
              option: {
                type: "raw",
                data: "Salesforce"
              }
            },
          },
          // 10 jxOhDycxUnMA0KGJAFbP
          {
            type: "Operation",
            selector: {
              workflow: config.selector.workflow,
              app: "clara",
              app_action: "update_session"
            },
            key: "rb_internal_key_10",
            redis: {
              field: "rb_internal_key_1",
              type: "hash_map"
            },
            next_operation: {
              selector: config.selector.workflow.map(workflowKey => ({
                workflow: workflowKey,
                operation: "rb_internal_key_11"
              }))
            },
            input: {
              format_function: [
                {
                args: {
                  amount: 1
                },
                output: "rb_internal_key_1:length",
                value: {
                  data: "rb_internal_key_1:rb_internal_key_1:length",
                  default: {
                    data: 0,
                    type: "raw"
                  },
                  type: "redis",
                  rkey_type: "hash_map"
                },
                operation: "increment"
                }
              ]
            },
            output: {}
          },
          // 11 j9r3ACYKGiII3tWk2AKE
          {
            type: "Operation",
            selector: {
              workflow: config.selector.workflow,
              app: "clara",
              app_action: "switch_condition"
            },
            key: "rb_internal_key_11",
            input: { },
            payload: {
              condition: {
                type: "redis",
                data: "integration_options:integration_options:length",
                rkey_type: "hash_map"
              },
              case_2: {
                data: 2,
                next_operation: {
                  selector: config.selector.workflow.map(workflowKey => ({
                    workflow: workflowKey,
                    operation: "rb_internal_key_13"
                  }))
                },
                match_operation: ">=",
                type: "raw"
              },
              case_1: {
                next_operation: {
                  selector: config.selector.workflow.map(workflowKey => ({
                    workflow: workflowKey,
                    operation: "rb_internal_key_15"
                  }))
                },
                match_operation: "==",
                data: 1,
                type: "raw"
              }
            },
            redis: {
              field: "integration_options",
              type: "array"
            },
            next_operation: {
              selector: config.selector.workflow.map(workflowKey => ({
                workflow: workflowKey,
                operation: "rb_internal_key_12"
              }))
            },
            output: {},
          },
          // 12 oy3m63KISNrwno19wxHD
          {
            type: "Operation",
            selector: {
              workflow: config.selector.workflow,
              app: "whatsapp",
              app_action: "send_message"
            },
            key: "rb_internal_key_12",
            output: {
              operation_type: "drop_session"
            },
            next_operation: {},
            payload: {
              content: {
                data: "missing_integration",
                type: "get_by_lang"
              },
              userFsId: {
                type: "struct",
                data: "User.Id"
              }
            }
          },
          // 13 xQKGcxepoYXvoOngvRSP
          {
            type: "Operation",
            selector: {
              workflow: config.selector.workflow,
              app: "whatsapp",
              app_action: "send_message"
            },
            key: "rb_internal_key_13",
            redis: {},
            output: {},
            payload: {
              content: {
                data: "request_target_crm",
                type: "get_by_lang"
              },
              options: {
                data: "integration_options:option",
                type: "redis",
                rkey_type: "array"
              },
              userFsId: {
                type: "struct",
                data: "User.Id"
              }
            },
            next_operation: {
              selector: config.selector.workflow.map(workflowKey => ({
                workflow: workflowKey,
                operation: "rb_internal_key_14"
              }))
            },
            input: {
              redis_functions: [
                {
                  operation: "delete_key",
                  path: "integration_options*"
                }
              ]
            }
          },
          // 14 MDUil4OCMeyXQ6RYOi7e
          {
            type: "Operation",
            selector: {
              workflow: config.selector.workflow,
              app: "clara",
              app_action: "get_notification"
            },
            key: "rb_internal_key_14",
            redis: {
              type: "hash_map",
              field: "rb_internal_key_14"
            },
            next_operation: {
              selector: config.selector.workflow.map(workflowKey => ({
                workflow: workflowKey,
                operation: "rb_internal_key_15"
              }))
            },
            payload: {
              timeout: {
                type: "raw",
                data: 60
              }
            }
          },
          // 16 0f5DTkJyukJjIsSGpyCi
          {
            type: "Operation",
            selector: {
              workflow: config.selector.workflow,
              app: "clara",
              app_action: "update_session"
            },
            key: "rb_internal_key_16",
            input: {
              format_function: [
                {
                value: {
                  data: "integration_options:integration_options:length",
                  type: "redis",
                  rkey_type: "hash_map",
                  default: {
                    data: 0,
                    type: "raw"
                  }
                },
                operation: "increment",
                args: {
                  amount: 1
                },
                output: "integration_options:length"
                }
              ]
            },
            redis: {
              field: "integration_options",
              type: "hash_map"
            },
            next_operation: {
              selector: config.selector.workflow.map(workflowKey => ({
                workflow: workflowKey,
                operation: "rb_internal_key_5"
              }))
            },
            output: {}
          },
          // 15 O5o4z3hn2Pv9SqIvj6UR
          {
            type: "Operation",
            selector: {
              workflow: config.selector.workflow,
              app: "clara",
              app_action: "switch_condition"
            },
            key: "rb_internal_key_15",
            output: { },
            payload: {
              case_1: {
                type: "raw",
                data: "HubSpot",
                next_operation: {
                  selector: config.selector.workflow.map(workflowKey => ({
                    workflow: workflowKey,
                    operation: ((config.payload || {}).on_hubspot || {}).data || ""
                  }))
                },
                match_operation: "=="
              },
              case_3: {
                next_operation: {
                  selector: config.selector.workflow.map(workflowKey => ({
                    workflow: workflowKey,
                    operation: ((config.payload || {}).on_mailing || {}).data || ""
                  }))
                },
                match_operation: "==",
                data: "Mailing",
                type: "raw"
              },
              condition: {
                rkey_type: "array_item",
                type: "redis",
                default: { },
                vars: {
                  user_index: {
                  default: {
                    type: "raw",
                    data: "0"
                  },
                  rkey_type: "hash_map",
                  type: "redis",
                  data: "rb_internal_key_14:message_data:message:body"
                  }
                },
                data: "integration_options:option:$user_index"
              },
              case_2: {
                type: "raw",
                next_operation: {
                  selector: config.selector.workflow.map(workflowKey => ({
                    workflow: workflowKey,
                    operation: ((config.payload || {}).on_salesforce || {}).data || ""
                  }))
                },
                match_operation: "==",
                data: "Salesforce"
              }
            },
            next_operation: {
              selector: config.selector.workflow.map(workflowKey => ({
                workflow: workflowKey,
                operation: "rb_internal_key_12"
              }))
            },
            input: {
              format_function: [
                {
                args: {
                  amount: 1
                },
                value: {
                  data: "message_data.message.body",
                  type: "request"
                },
                output: "message_data:message:body",
                operation: "decrement"
                }
              ]
            },
            redis: {
              type: "hash_map",
              field: "rb_internal_key_15"
            },
          },
        ]

        const formatOperation = (operation, uuidMap) => {
          Object.keys(operation).forEach(key => {
            // replace keys
            if (typeof operation[key] === "string") {
              if (operation[key].includes("rb_internal_key_")) {
                const [keyIndex] = /(?!x)\d+/.exec(operation[key])
                const replacedString = operation[key].replace(`rb_internal_key_${keyIndex}`, uuidMap[`rb_internal_key_${keyIndex}`])
                operation[key] = replacedString
              }
            }

            if (typeof operation[key] === "object") {
              formatOperation(operation[key], uuidMap)
            }
          })
        }

        baseOperations.forEach(operation => {
          formatOperation(operation, uuidMap)
        })

        item.ungroup = baseOperations

        return item
      }
    }
  ].map(fn => fn())
}
