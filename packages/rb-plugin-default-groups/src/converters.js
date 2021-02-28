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
      ((config.selector || []).workflows || []).forEach(workflowKey => {
        if ((operationsMap[config.key] || {})[workflowKey]) {
          isExists = true
          break
        }
      })

      if (isExists) {
        console.log("releai_active_integrations Exists!")
      } else {
        console.log("genereate new items")
        const baseOperations = [
          // 0 wmTSPt0RLortgvKt1XzP
          {
            selector: {
              workflows: config.selector.workflows,
              app: "clara",
              app_action: "switch_condition"
            },
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
                  selector: config.selector.workflows.map(workflowKey => ({
                    workflow: workflowKey,
                    operation: 1
                  }))
                },
                type: "raw"
              }
            },
            next_operation: {
              selector: config.selector.workflows.map(workflowKey => ({
                workflow: workflowKey,
                operation: 3
              }))
            },
          },
          // 1 Ohj8MzuedAwBriCeSeqA
          {
            selector: {
              workflows: config.selector.workflows,
              app: "clara",
              app_action: "update_session"
            },
            key: "",
            payload: {
              option: {
                type: "raw",
                data: "HubSpot"
              }
            },
            next_operation: {
              selector: config.selector.workflows.map(workflowKey => ({
                workflow: workflowKey,
                operation: 2
              }))
            },
            redis: {
              field: 2,
              type: "array"
            },
            output: {},
          },
          // 2 lifDOcWYsvQPoF9jCJHh
          {
            selector: {
              workflows: config.selector.workflows,
              app: "clara",
              app_action: "update_session"
            },
            key: "",
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
            payload: {},
            next_operation: {
              selector: config.selector.workflows.map(workflowKey => ({
                workflow: workflowKey,
                operation: 3
              }))
            },
          },
          // 3 APKeOUITJymF6TxMXQbv
          {
            selector: {
              workflows: config.selector.workflows,
              app: "clara",
              app_action: "switch_condition"
            },
            key: "",
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
                  Xmr52oMiiQt9M8eQZdYQ: 4,
                },
                data: "",
                type: "raw",
                match_operation: "!="
              }
            },
            output: {},
            next_operation: {
              Xmr52oMiiQt9M8eQZdYQ: 5,
            },
            redis: {}
          },
          // 4 kmkwgDnjYs03tckh0xKe
          {
            selector: {
              workflows: config.selector.workflows,
              app: "clara",
              app_action: "update_session"
            },
            key: "",
            output: {},
            redis: {
              type: "array",
              field: "integration_options"
            },
            next_operation: {
              Xmr52oMiiQt9M8eQZdYQ: 16
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
            selector: {
              workflows: config.selector.workflows,
              app: "clara",
              app_action: "switch_condition"
            },
            key: "",
            redis: {},
            payload: {
              case_1: {
                type: "raw",
                next_operation: {
                Xmr52oMiiQt9M8eQZdYQ: 6
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
              Xmr52oMiiQt9M8eQZdYQ: 8
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
            selector: {
              workflows: config.selector.workflows,
              app: "clara",
              app_action: "update_session"
            },
            key: "",
            output: {},
            payload: {
              option: {
                data: "Mailing",
                type: "raw"
              }
            },
            next_operation: {
              Xmr52oMiiQt9M8eQZdYQ: 7
            },
            input: {},
            redis: {
              type: "array",
              field: "integration_options"
            },
          },
          // 7 q5LGP3iQkZFnIfXj8xgl
          {
            selector: {
              workflows: config.selector.workflows,
              app: "clara",
              app_action: "update_session"
            },
            key: "",
            next_operation: {
              Xmr52oMiiQt9M8eQZdYQ: 8
            },
            payload: {},
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
            selector: {
              workflows: config.selector.workflows,
              app: "clara",
              app_action: "switch_condition"
            },
            key: "",
            redis: { },
            payload: {
              case_1: {
              match_operation: "!=",
              type: "raw",
              next_operation: {
                Xmr52oMiiQt9M8eQZdYQ: 9,
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
              Xmr52oMiiQt9M8eQZdYQ: "j9r3ACYKGiII3tWk2AKE"
            },
          },
          // 9 mZpSztQsXIMKBPWDhv9f
          {
            selector: {
              workflows: config.selector.workflows,
              app: "clara",
              app_action: "switch_condition"
            },
            key: "",
            next_operation: {
              Xmr52oMiiQt9M8eQZdYQ: 11,
            },
            output: { },
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
            selector: {
              workflows: config.selector.workflows,
              app: "clara",
              app_action: "update_session"
            },
            key: "",
            redis: {
              field: "integration_options",
              type: "hash_map"
            },
            next_operation: {
              Xmr52oMiiQt9M8eQZdYQ: 11,
            },
            input: {
              format_function: [
                {
                args: {
                  amount: 1
                },
                output: "integration_options:length",
                value: {
                  data: "integration_options:integration_options:length",
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
            output: { },
            payload: { }
          },
          // 11 j9r3ACYKGiII3tWk2AKE
          {
            selector: {
              workflows: config.selector.workflows,
              app: "clara",
              app_action: "switch_condition"
            },
            key: "",
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
                  Xmr52oMiiQt9M8eQZdYQ: 13,
                },
                match_operation: ">=",
                type: "raw"
              },
              case_1: {
                next_operation: {
                  Xmr52oMiiQt9M8eQZdYQ: 15,
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
              Xmr52oMiiQt9M8eQZdYQ: 12
            },
            output: {},
          },
          // 12 oy3m63KISNrwno19wxHD
          {
            selector: {
              workflows: config.selector.workflows,
              app: "whatsapp",
              app_action: "send_message"
            },
            key: "",
            output: {
              operation_type: "drop_session"
            },
            next_operation: { },
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
            selector: {
              workflows: config.selector.workflows,
              app: "whatsapp",
              app_action: "send_message"
            },
            key: "",
            redis: { },
            output: { },
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
              Xmr52oMiiQt9M8eQZdYQ: 14
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
            selector: {
              workflows: config.selector.workflows,
              app: "clara",
              app_action: "get_notification"
            },
            key: "",
            redis: {
              type: "hash_map",
              field: "get_integration_selection"
            },
            next_operation: {
              XYdqWKFzaup3nAuJ2egP: 15
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
            selector: {
              workflows: config.selector.workflows,
              app: "clara",
              app_action: "update_session"
            },
            key: "",
            payload: { },
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
              Xmr52oMiiQt9M8eQZdYQ: 5
            },
            output: { }
          },
          // 15 O5o4z3hn2Pv9SqIvj6UR
          {
            selector: {
              workflows: config.selector.workflows,
              app: "clara",
              app_action: "switch_case"
            },
            key: "",
            output: { },
            payload: {
              case_1: {
                type: "raw",
                data: "HubSpot",
                next_operation: {
                  Xmr52oMiiQt9M8eQZdYQ: "fC72UyUOu8qZOcSfRaSm", // on hubspot
                },
                match_operation: "=="
              },
              case_3: {
                next_operation: {
                  Xmr52oMiiQt9M8eQZdYQ: "06XXMEnvjmCabCvDMM83" // on mailing
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
                  data: "get_integration_selection:message_data:message:body"
                  }
                },
                data: "integration_options:option:$user_index"
              },
              case_2: {
                type: "raw",
                next_operation: {
                  Xmr52oMiiQt9M8eQZdYQ: "CMOBXj0SKVV9NDx2DiFk", // on salesforce
                },
                match_operation: "==",
                data: "Salesforce"
              }
            },
            next_operation: {
              Xmr52oMiiQt9M8eQZdYQ: "oy3m63KISNrwno19wxHD",
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
              field: "integration_switch_case"
            },
          },
        ]
      }

    }
  ].map(fn => fn())
}
