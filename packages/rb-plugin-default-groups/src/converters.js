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
    }
  ].map(fn => fn())
}
