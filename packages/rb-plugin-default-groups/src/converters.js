const uuidv4 = require("uuid").v4
const { docListToObj } = require("@releai/cli/src/utils")
const { cleanEmptyFields } = require("@releai/cli/src/utils/formatters")
const { WorkflowsClient, OperationsClient } = require("@releai/cli/lib/components")

module.exports = async (config, { accessToken }) => {
  const operations = docListToObj((await (new OperationsClient(accessToken).list())))
  const workflows = docListToObj((await (new WorkflowsClient(accessToken).list())))

  return [
    // convert send message
    () => {
      const operationsMap = {}

      Object.values(operations).forEach((operation) => {
        if (!operationsMap[operation.key]) {
          operationsMap[operation.key] = {}
        }

        Object.entries((operation.next_operation || {})).forEach(([workflowId, operationId]) => {
          operationsMap[operation.key][workflows[workflowId].key] = operations[operationId].key
        })
      })

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
        ],
      }

      const baseOperations = [
        // rb_internal_key_1 - wmTSPt0RLortgvKt1XzP
        {
          type: "Operation",
          selector: {
            workflow: config.selector.workflow,
            app: "clara",
            app_action: "switch_condition"
          },
          key: "rb_internal_key_1",
          is_root: config.is_root || false,
          next_operation: {
            selector: config.selector.workflow.map(workflowKey => ({
              workflow: workflowKey,
              operation: "rb_internal_key_4"
            }))
          },
          payload: {
            case_1: {
              data: "",
              type: "raw",
              match_operation: "!=",
              next_operation: {
                selector: config.selector.workflow.map(workflowKey => ({
                  workflow: workflowKey,
                  operation: "rb_internal_key_2"
                }))
              },
            },
            condition: {
              data: "Org.Hubspot.ApiKey",
              type: "struct"
            },
          },
           redis: {}
        },
        // rb_internal_key_2 - Ohj8MzuedAwBriCeSeqA
        {
          type: "Operation",
          selector: {
            workflow: config.selector.workflow,
            app: "clara",
            app_action: "update_session"
          },
          key: "rb_internal_key_2",
          next_operation: {
            selector: config.selector.workflow.map(workflowKey => ({
              workflow: workflowKey,
              operation: "rb_internal_key_3"
            }))
          },
          payload: {
            option: {
              data: "HubSpot",
              type: "raw"
            }
          },
          redis: {
            field: "integration_options",
            type: "array"
          }
        },
        // rb_internal_key_3 lifDOcWYsvQPoF9jCJHh
        {
          type: "Operation",
          selector: {
            workflow: config.selector.workflow,
            app: "clara",
            app_action: "update_session"
          },
          next_operation: {
            selector: config.selector.workflow.map(workflowKey => ({
              workflow: workflowKey,
              operation: "rb_internal_key_4"
            }))
          },
          key: "rb_internal_key_3",
          input: {
            format_function: [
              {
                args: {
                  amount: 1
                },
                operation: "increment",
                output: "integration_options:length",
                value: {
                  data: "integration_options:integration_options:length",
                  rkey_type: "hash_map",
                  type: "redis",
                  default: {
                    data: 0,
                    type: "raw"
                  }
                }
              }
            ]
          },
          redis: {
            field: "integration_options",
            type: "hash_map"
          }
        },
        // rb_internal_key_4 - xQKGcxepoYXvoOngvRSP
        {
          type: "Operation",
          selector: {
            workflow: config.selector.workflow,
            app: "whatsapp",
            app_action: "send_message"
          },
          key: "rb_internal_key_4",
          next_operation: {
            selector: config.selector.workflow.map(workflowKey => ({
              workflow: workflowKey,
              operation: "rb_internal_key_5"
            }))
          },
          input: {
            redis_functions: [
              {
                operation: "delete_key",
                path: "integration_options*"
              }
            ]
          },
          payload: {
            content: {
              data: "request_target_crm",
              type: "get_by_lang"
            },
            options: {
              data: "integration_options:option",
              rkey_type: "array",
              type: "redis"
            },
            userFsId: {
              data: "User.Id",
              type: "struct"
            }
          }
        },
        // rb_internal_key_5 - MDUil4OCMeyXQ6RYOi7e
        {
          type: "Operation",
          selector: {
            workflow: config.selector.workflow,
            app: "clara",
            app_action: "get_notification"
          },
          key: "rb_internal_key_5",
          next_operation: {
            selector: config.selector.workflow.map(workflowKey => ({
              workflow: workflowKey,
              operation: "rb_internal_key_6"
            }))
          },
          payload: {
            timeout: {
              data: 60,
              type: "raw"
            }
          },
          redis: {
            field: "get_integration_selection",
            type: "hash_map"
          }
        },
        // rb_internal_key_6 done
        {
          type: "Operation",
          key: "rb_internal_key_6",
          selector: {
            workflow: config.selector.workflow,
            app: "whatsapp",
            app_action: "send_message"
          },
          payload: {
            content: {
              data: "DONE",
              type: "raw"
            },
            userFsId: {
              data: "User.Id",
              type: "struct"
            }
          }
        }
      ]

      item.ungroup = baseOperations
      return item
    }
  ].map(fn => fn())
}
