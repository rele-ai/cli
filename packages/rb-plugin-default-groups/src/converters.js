const uuidv4 = require("uuid").v4
const { docListToObj } = require("./utils")
const { cleanEmptyFields } = require("./utils")
const { WorkflowsClient, OperationsClient, /*AppActionsClient, AppsClient*/ } = require("@releai/cli/lib/components")

module.exports = async (config, { accessToken }) => {
  const operations = docListToObj((await (new OperationsClient(accessToken).list())))
  const workflows = docListToObj((await (new WorkflowsClient(accessToken).list())))
  // const appActions = docListToObj((await (new AppActionsClient(accessToken).list())))
  // const apps = docListToObj((await (new AppsClient(accessToken).list())))

  const operationsMap = {}

  Object.values(operations).forEach((operation) => {
    if (!operationsMap[operation.key]) {
      operationsMap[operation.key] = {}
    }

    Object.keys(operation.next || {}).forEach((workflowId) => {
      try {
        const nextOpType = operation.next[workflowId].type
        const nextOpId = operation.next[workflowId].id

        if (nextOpType === "operation") {
          operationsMap[operation.key][workflows[workflowId].key] = operations[nextOpId].key
        }
      } catch (e) {
        throw new Error(`An unexpected error occurred while decomposing into groups.\nPlease contact support@rele.ai with the following error information: operationId = ${operationId} and workflowId = ${workflowId}`)
      }
    })
  })

  return [
    // convert send message
    () => {
      let baseOperation = {
        ...config,
        payload: {},
        next: {
          selector: ((config.next || {}).selector || []).map(({ type, data }) => ({
            type,
            data: {
              workflow: data.workflow,
              next: (operationsMap[config.key] || {})[data.workflow] ? operationsMap[config.key][data.workflow] : `__rb_internal_${uuidv4().replace(/-/g, "_")}_get_notification`
            }
          }))
        },
        output: ((config.next || {}).selector || []).length === 0 ? config.output : {},
        redis: ((config.next || {}).selector || []).length === 0 ? config.redis : {},
      }

      // attach content and options to payload
      if (Object.keys(((config.payload || {}).content || {})).length) {
        baseOperation.payload.content = config.payload.content || {}
      }

      if (Object.keys(((config.payload || {}).options || {})).length) {
        baseOperation.payload.options = config.payload.options || {}
      }

      const item = {
        filters: [
          [(config.selector || {}).app_action || "", "==", "send_message"],
          [(config.output || {}).operation_type || "", "!=", "drop_session"],
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
            next: {
              // selector: internalOperations.map((io) => io.next.selector).flat()
              selector: internalOperations.map((io) => io.next.selector).flat().filter((element, index, self) =>
                index === self.findIndex((t) => (
                  t.type === element.type && element.data.workflow === t.data.workflow && element.data.next === t.data.next
                ))
              )
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

      const nextSelector = ((baseOperation.next || {}).selector || [])
      nextSelector.forEach((selector) => {
        const baseNextOp = {
          type: "Operation",
          selector: {
            app: "core",
            app_action: "get_notification",
            workflow: (config.selector || {}).workflow || []
          },
          is_root: false,
          next: (config.next || {}),
          on_error: (config.on_error || {}),
          output: (config.output || {}),
          input: {},
          redis: (config.redis || {}),
          payload: {
            timeout: {
              data: 60,
              type: "raw"
            }
          },
          key: selector.data.next
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
          [(config.selector || {}).app || "", "==", "core"]
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
            next: operation.next || {},
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
    // () => {
    //   const item = {
    //     filters: [
    //       [(config.selector || {}).app || "", "==", "core"],
    //       [(config.selector || {}).app_action || "", "==", "releai_active_integrations"]
    //     ],
    //     ungroup: []
    //   }

    //   const configNextHusbpot = ((((config.payload || {}).hubspot || {}).next_operation || {}).selector || {}).workflow || []
    //   const configNextSalesforce = ((((config.payload || {}).salesforce || {}).next_operation || {}).selector || {}).workflow || []
    //   const configNextMailing = ((((config.payload || {}).mailing || {}).next_operation || {}).selector || {}).workflow || []

    //   // define baseOperations
    //   let baseOperations = []

    //   // check if operation exists
    //   const isExists = (
    //     config.selector.workflow.map(workflowKey => {
    //       return Boolean((operationsMap[config.key] || {})[workflowKey])
    //     })
    //   ).includes(true)

    //   if (isExists) {
    //     // pull the init operation
    //     // of the rele active integrations
    //     const rootOp = Object.values(operations).find(op => op.key === config.key)

    //     // define ids list
    //     let releActiveIntegrationsIds = []

    //     // found ids of next ops function
    //     const findNextOps = (root) => {
    //       // loop over object
    //       Object.keys(root).forEach(key => {

    //         // check if we reaches next operation key
    //         if (key === "next_operation") {

    //           // pull next id
    //           const nextId = Object.values(root[key])

    //           // add relevant id
    //           nextId.forEach(id => {
    //             if (operations[id].key.startsWith("__rb_internal") && operations[id].key.includes("_releai_active_integrations")) {
    //               releActiveIntegrationsIds.push(id)
    //               findNextOps(operations[id])
    //             }
    //           })
    //         }

    //         if (typeof root[key] === "object") {
    //           findNextOps(root[key])
    //         }
    //       })
    //     }

    //     // call recursive function
    //     findNextOps(rootOp)

    //     // remove duplicates
    //     releActiveIntegrationsIds = [rootOp.id, ...new Set(releActiveIntegrationsIds)]

    //     // pull last operation in chunck to change
    //     // pointers
    //     const lastOpId = Object.keys(operations).find(key => {
    //       return operations[key].key.includes("_last_op")
    //     })

    //     releActiveIntegrationsIds.forEach(id => {
    //       const doc = operations[id]

    //       let data = {
    //         type: "Operation",
    //         selector: {
    //           workflow: doc.workflows.map((wid) => workflows[wid].key),
    //           app: apps[doc.app_id].system_key,
    //           app_action: appActions[doc.action.id].operation_key
    //         },
    //         next_operation: doc.next_operation || {},
    //         on_error: doc.on_error || {},
    //         payload: doc.payload,
    //         is_root: doc.is_root || false,
    //         input: doc.input,
    //         output: doc.output,
    //         redis: doc.redis,
    //         key: doc.key
    //       }

    //       // attach next operations and on error
    //       loadConfNextOperations(data, workflows, operations)

    //       if (lastOpId === id) {
    //         data = {
    //           type: "Operation",
    //           selector: {
    //             workflow: doc.workflows.map((wid) => workflows[wid].key),
    //             app: apps[doc.app_id].system_key,
    //             app_action: appActions[doc.action.id].operation_key
    //           },
    //           key: doc.key,
    //           next_operation: doc.next_operation || {},
    //           on_error: doc.on_error || {},
    //           is_root: doc.is_root || false,
    //           input: doc.input,
    //           output: doc.output,
    //           redis: doc.redis,
    //           key: doc.key,
    //           payload: {
    //             case_1: {
    //               data: "HubSpot",
    //               type: "raw",
    //               match_operation: "==",
    //               next_operation: {
    //                 selector: configNextHusbpot.map(workflowKey => ({
    //                   workflow: workflowKey,
    //                   operation: config.payload.hubspot.next_operation.selector.operation
    //                 }))
    //               },
    //             },
    //             case_2: {
    //               data: "Salesforce",
    //               type: "raw",
    //               match_operation: "==",
    //               next_operation: {
    //                 selector: configNextSalesforce.map(workflowKey => ({
    //                   workflow: workflowKey,
    //                   operation: config.payload.salesforce.next_operation.selector.operation
    //                 }))
    //               },
    //             },
    //             case_3: {
    //               data: "Mailing",
    //               type: "raw",
    //               match_operation: "==",
    //               next_operation: {
    //                 selector: configNextMailing.map(workflowKey => ({
    //                   workflow: workflowKey,
    //                   operation: ((((config.payload || {}).mailing || {}).next_operation || {}).selector || {}).operation || ""
    //                 }))
    //               },
    //             },
    //             condition: {
    //               data: "integration_options:option:$user_index",
    //               type: "redis",
    //               rkey_type: "array_item",
    //               vars: {
    //                 user_index: {
    //                   data: "get_integration_selection:message_data:message:body",
    //                   type: "redis",
    //                   rkey_type: "hash_map",
    //                   default: {
    //                     data: "0",
    //                     type: "raw"
    //                   }
    //                 }
    //               }
    //             }
    //           }
    //         }
    //       }

    //       baseOperations.push(data)
    //     })
    //   } else {
    //     baseOperations = [
    //       {
    //         type: "Operation",
    //         selector: {
    //           workflow: config.selector.workflow,
    //           app: "core",
    //           app_action: "switch_condition"
    //         },
    //         key: config.key || "rb_internal_key_1",
    //         is_root: config.is_root || false,
    //         next_operation: {
    //           selector: config.selector.workflow.map(workflowKey => ({
    //             workflow: workflowKey,
    //             operation: "rb_internal_key_4"
    //           }))
    //         },
    //         payload: {
    //           case_1: {
    //             data: "",
    //             type: "raw",
    //             match_operation: "!=",
    //             next_operation: {
    //               selector: config.selector.workflow.map(workflowKey => ({
    //                 workflow: workflowKey,
    //                 operation: "rb_internal_key_2"
    //               }))
    //             },
    //           },
    //           condition: {
    //             data: "Org.Hubspot.ApiKey",
    //             type: "struct"
    //           },
    //         },
    //          redis: {}
    //       },
    //       // rb_internal_key_2 - Ohj8MzuedAwBriCeSeqA
    //       {
    //         type: "Operation",
    //         selector: {
    //           workflow: config.selector.workflow,
    //           app: "core",
    //           app_action: "update_session"
    //         },
    //         key: "rb_internal_key_2",
    //         next_operation: {
    //           selector: config.selector.workflow.map(workflowKey => ({
    //             workflow: workflowKey,
    //             operation: "rb_internal_key_3"
    //           }))
    //         },
    //         payload: {
    //           option: {
    //             data: "HubSpot",
    //             type: "raw"
    //           }
    //         },
    //         redis: {
    //           field: "integration_options",
    //           type: "array"
    //         }
    //       },
    //       // rb_internal_key_3 lifDOcWYsvQPoF9jCJHh
    //       {
    //         type: "Operation",
    //         selector: {
    //           workflow: config.selector.workflow,
    //           app: "core",
    //           app_action: "update_session"
    //         },
    //         next_operation: {
    //           selector: config.selector.workflow.map(workflowKey => ({
    //             workflow: workflowKey,
    //             operation: "rb_internal_key_4"
    //           }))
    //         },
    //         key: "rb_internal_key_3",
    //         input: {
    //           format_function: [
    //             {
    //               args: {
    //                 amount: 1
    //               },
    //               operation: "increment",
    //               output: "integration_options:length",
    //               value: {
    //                 data: "integration_options:integration_options:length",
    //                 rkey_type: "hash_map",
    //                 type: "redis",
    //                 default: {
    //                   data: 0,
    //                   type: "raw"
    //                 }
    //               }
    //             }
    //           ]
    //         },
    //         redis: {
    //           field: "integration_options",
    //           type: "hash_map"
    //         }
    //       },
    //       // rb_internal_key_4 APKeOUITJymF6TxMXQbv
    //       {
    //         type: "Operation",
    //         selector: {
    //           workflow: config.selector.workflow,
    //           app: "core",
    //           app_action: "switch_condition"
    //         },
    //         key: "rb_internal_key_4",
    //         next_operation: {
    //           selector: config.selector.workflow.map(workflowKey => ({
    //             workflow: workflowKey,
    //             operation: "rb_internal_key_7"
    //           }))
    //         },
    //         payload: {
    //           case_1: {
    //             data: "",
    //             type: "raw",
    //             match_operation: "!=",
    //             next_operation: {
    //               selector: config.selector.workflow.map(workflowKey => ({
    //                 workflow: workflowKey,
    //                 operation: "rb_internal_key_5"
    //               }))
    //             },
    //           },
    //           condition: {
    //             data: "User.Hubspot.$org_id",
    //             type: "struct",
    //             vars: {
    //               org_id: {
    //                 data: "Org.Id",
    //                 type: "struct"
    //               }
    //             }
    //           }
    //         }
    //       },
    //       // rb_internal_key_5 - kmkwgDnjYs03tckh0xKe
    //       {
    //         type: "Operation",
    //         selector: {
    //           workflow: config.selector.workflow,
    //           app: "core",
    //           app_action: "update_session"
    //         },
    //         key: "rb_internal_key_5",
    //         next_operation: {
    //           selector: config.selector.workflow.map(workflowKey => ({
    //             workflow: workflowKey,
    //             operation: "rb_internal_key_6"
    //           }))
    //         },
    //         payload: {
    //           option: {
    //             data: "HubSpot",
    //             type: "raw"
    //           }
    //         },
    //         redis: {
    //           field: "integration_options",
    //           type: "array"
    //         }
    //       },
    //       // rb_internal_key_6 0f5DTkJyukJjIsSGpyCi
    //       {
    //         type: "Operation",
    //         selector: {
    //           workflow: config.selector.workflow,
    //           app: "core",
    //           app_action: "update_session"
    //         },
    //         next_operation: {
    //           selector: config.selector.workflow.map(workflowKey => ({
    //             workflow: workflowKey,
    //             operation: "rb_internal_key_7"
    //           }))
    //         },
    //         key: "rb_internal_key_6",
    //         input: {
    //           format_function: [
    //             {
    //               args: {
    //                 amount: 1
    //               },
    //               operation: "increment",
    //               output: "integration_options:length",
    //               value: {
    //                 data: "integration_options:integration_options:length",
    //                 rkey_type: "hash_map",
    //                 type: "redis",
    //                 default: {
    //                   data: 0,
    //                   type: "raw"
    //                 }
    //               }
    //             }
    //           ]
    //         },
    //         redis: {
    //           field: "integration_options",
    //           type: "hash_map"
    //         }
    //       },
    //       // rb_internal_key_7 apxCjjsRN4qL2z1BAOVD
    //       {
    //         type: "Operation",
    //         selector: {
    //           workflow: config.selector.workflow,
    //           app: "core",
    //           app_action: "switch_condition"
    //         },
    //         redis: {
    //           field: "check_mailing",
    //           type: "hash_map"
    //         },
    //         key: "rb_internal_key_7",
    //         next_operation: {
    //           selector: config.selector.workflow.map(workflowKey => ({
    //             workflow: workflowKey,
    //             operation: "rb_internal_key_10"
    //           }))
    //         },
    //         input: {
    //           format_function: [
    //             {
    //               operation: "get_length",
    //               output: "check_email_integration:results:length",
    //               value: {
    //                 data: "User.Mailing.$org_id.Values",
    //                 type: "struct",
    //                 vars: {
    //                   org_id: {
    //                     data: "Org.Id",
    //                     type: "struct"
    //                   }
    //                 }
    //               }
    //             }
    //           ]
    //         },
    //         payload: {
    //           case_1: {
    //             data: 0,
    //             type: "raw",
    //             match_operation: ">",
    //             next_operation: {
    //               selector: config.selector.workflow.map(workflowKey => ({
    //                 workflow: workflowKey,
    //                 operation: "rb_internal_key_8"
    //               }))
    //             },
    //           },
    //           condition: {
    //             data: "check_mailing:check_email_integration:results:length",
    //             rkey_type: "hash_map",
    //             type: "redis"
    //           }
    //         }
    //       },
    //       // rb_internal_key_8 apxCjjsRN4qL2z1BAOVD
    //       {
    //         type: "Operation",
    //         selector: {
    //           workflow: config.selector.workflow,
    //           app: "core",
    //           app_action: "update_session"
    //         },
    //         key: "rb_internal_key_8",
    //         next_operation: {
    //           selector: config.selector.workflow.map(workflowKey => ({
    //             workflow: workflowKey,
    //             operation: "rb_internal_key_9"
    //           }))
    //         },
    //         payload: {
    //           option: {
    //             data: "Mailing",
    //             type: "raw"
    //           }
    //         },
    //         redis: {
    //           field: "integration_options",
    //           type: "array"
    //         }
    //       },
    //       // rb_internal_key_9 - q5LGP3iQkZFnIfXj8xgl
    //       {
    //         type: "Operation",
    //         selector: {
    //           workflow: config.selector.workflow,
    //           app: "core",
    //           app_action: "update_session"
    //         },
    //         next_operation: {
    //           selector: config.selector.workflow.map(workflowKey => ({
    //             workflow: workflowKey,
    //             operation: "rb_internal_key_10"
    //           }))
    //         },
    //         key: "rb_internal_key_9",
    //         input: {
    //           format_function: [
    //             {
    //               args: {
    //                 amount: 1
    //               },
    //               operation: "increment",
    //               output: "integration_options:length",
    //               value: {
    //                 data: "integration_options:integration_options:length",
    //                 rkey_type: "hash_map",
    //                 type: "redis",
    //                 default: {
    //                   data: 0,
    //                   type: "raw"
    //                 }
    //               }
    //             }
    //           ]
    //         },
    //         redis: {
    //           field: "integration_options",
    //           type: "hash_map"
    //         }
    //       },
    //       // rb_internal_key_10 cojkBCspYzPdEV3F54hs
    //       {
    //         type: "Operation",
    //         selector: {
    //           workflow: config.selector.workflow,
    //           app: "core",
    //           app_action: "switch_condition"
    //         },
    //         key: "rb_internal_key_10",
    //         next_operation: {
    //           selector: config.selector.workflow.map(workflowKey => ({
    //             workflow: workflowKey,
    //             operation: "rb_internal_key_13"
    //           }))
    //         },
    //         payload: {
    //           case_1: {
    //             data: "",
    //             type: "raw",
    //             match_operation: "!=",
    //             next_operation: {
    //               selector: config.selector.workflow.map(workflowKey => ({
    //                 workflow: workflowKey,
    //                 operation: "rb_internal_key_11"
    //               }))
    //             },
    //           },
    //           condition: {
    //             data: "User.Salesforce.$org_id",
    //             type: "struct",
    //             vars: {
    //               org_id: {
    //                 data: "Org.Id",
    //                 type: "struct"
    //               }
    //             }
    //           }
    //         }
    //       },
    //       // rb_internal_key_11 mZpSztQsXIMKBPWDhv9f
    //       {
    //         type: "Operation",
    //         key: "rb_internal_key_11",
    //         selector: {
    //           workflow: config.selector.workflow,
    //           app: "core",
    //           app_action: "update_session"
    //         },
    //         next_operation: {
    //           selector: config.selector.workflow.map(workflowKey => ({
    //             workflow: workflowKey,
    //             operation: "rb_internal_key_12"
    //           }))
    //         },
    //         payload: {
    //           option: {
    //             data: "Salesforce",
    //             type: "raw"
    //           }
    //         },
    //         redis: {
    //           field: "integration_options",
    //           type: "array"
    //         }
    //       },
    //       // rb_internal_key_12 - jxOhDycxUnMA0KGJAFbP
    //       {
    //         type: "Operation",
    //         selector: {
    //           workflow: config.selector.workflow,
    //           app: "core",
    //           app_action: "update_session"
    //         },
    //         next_operation: {
    //           selector: config.selector.workflow.map(workflowKey => ({
    //             workflow: workflowKey,
    //             operation: "rb_internal_key_13"
    //           }))
    //         },
    //         key: "rb_internal_key_12",
    //         input: {
    //           format_function: [
    //             {
    //               args: {
    //                 amount: 1
    //               },
    //               operation: "increment",
    //               output: "integration_options:length",
    //               value: {
    //                 data: "integration_options:integration_options:length",
    //                 rkey_type: "hash_map",
    //                 type: "redis",
    //                 default: {
    //                   data: 0,
    //                   type: "raw"
    //                 }
    //               }
    //             }
    //           ]
    //         },
    //         redis: {
    //           field: "integration_options",
    //           type: "hash_map"
    //         }
    //       },
    //       // rb_internal_key_13 j9r3ACYKGiII3tWk2AKE
    //       {
    //         type: "Operation",
    //         key: "rb_internal_key_13",
    //         selector: {
    //           workflow: config.selector.workflow,
    //           app: "core",
    //           app_action: "switch_condition"
    //         },
    //         next_operation: {
    //           selector: config.selector.workflow.map(workflowKey => ({
    //             workflow: workflowKey,
    //             operation: "rb_internal_key_17"
    //           }))
    //         },
    //         payload: {
    //           case_1: {
    //             data: 1,
    //             type: "raw",
    //             match_operation: "==",
    //             next_operation: {
    //               selector: config.selector.workflow.map(workflowKey => ({
    //                 workflow: workflowKey,
    //                 operation: "rb_internal_key_16"
    //               }))
    //             },
    //           },
    //           case_2: {
    //             data: 2,
    //             type: "raw",
    //             match_operation: ">=",
    //             next_operation: {
    //               selector: config.selector.workflow.map(workflowKey => ({
    //                 workflow: workflowKey,
    //                 operation: "rb_internal_key_14"
    //               }))
    //             },
    //           },
    //           condition: {
    //             data: "integration_options:integration_options:length",
    //             rkey_type: "hash_map",
    //             type: "redis"
    //           }
    //         },
    //         redis: {
    //           field: "integration_options",
    //           type: "array"
    //         }
    //       },
    //       // rb_internal_key_14 - xQKGcxepoYXvoOngvRSP
    //       {
    //         type: "Operation",
    //         key: "rb_internal_key_14",
    //         selector: {
    //           workflow: config.selector.workflow,
    //           app: "whatsapp",
    //           app_action: "send_message"
    //         },
    //         next_operation: {
    //           selector: config.selector.workflow.map(workflowKey => ({
    //             workflow: workflowKey,
    //             operation: "rb_internal_key_15"
    //           }))
    //         },
    //         payload: {
    //           content: {
    //             data: "request_target_crm",
    //             type: "get_by_lang"
    //           },
    //           options: {
    //             data: "integration_options:option",
    //             rkey_type: "array",
    //             type: "redis"
    //           },
    //           userFsId: {
    //             data: "User.Id",
    //             type: "struct"
    //           }
    //         }
    //       },
    //       // rb_internal_key_15 MDUil4OCMeyXQ6RYOi7e
    //       {
    //         type: "Operation",
    //         key: "rb_internal_key_15",
    //         selector: {
    //           workflow: config.selector.workflow,
    //           app: "core",
    //           app_action: "get_notification"
    //         },
    //         next_operation: {
    //           selector: config.selector.workflow.map(workflowKey => ({
    //             workflow: workflowKey,
    //             operation: "rb_internal_key_16"
    //           }))
    //         },
    //         payload: {
    //           timeout: {
    //             data: 60,
    //             type: "raw"
    //           }
    //         },
    //         redis: {
    //           field: "get_integration_selection",
    //           type: "hash_map"
    //         }
    //       },
    //       // rb_internal_key_16 O5o4z3hn2Pv9SqIvj6UR
    //       {
    //         type: "Operation",
    //         selector: {
    //           workflow: config.selector.workflow,
    //           app: "core",
    //           app_action: "switch_condition"
    //         },
    //         key: "rb_internal_key_16",
    //         next_operation: {
    //           selector: config.selector.workflow.map(workflowKey => ({
    //             workflow: workflowKey,
    //             operation: "rb_internal_key_17"
    //           }))
    //         },
    //         input: {
    //           format_function: [
    //             {
    //               args: {
    //                 amount: 1
    //               },
    //               operation: "decrement",
    //               output: "message_data:message:body",
    //               value: {
    //                 data: "message_data.message.body",
    //                 type: "request"
    //               }
    //             }
    //           ]
    //         },
    //         payload: {
    //           case_1: {
    //             data: "HubSpot",
    //             type: "raw",
    //             match_operation: "==",
    //             next_operation: {
    //               selector: configNextHusbpot.map(workflowKey => ({
    //                 workflow: workflowKey,
    //                 operation: config.payload.hubspot.next_operation.selector.operation
    //               }))
    //             },
    //           },
    //           case_2: {
    //             data: "Salesforce",
    //             type: "raw",
    //             match_operation: "==",
    //             next_operation: {
    //               selector: configNextSalesforce.map(workflowKey => ({
    //                 workflow: workflowKey,
    //                 operation: config.payload.salesforce.next_operation.selector.operation
    //               }))
    //             },
    //           },
    //           case_3: {
    //             data: "Mailing",
    //             type: "raw",
    //             match_operation: "==",
    //             next_operation: {
    //               selector: configNextMailing.map(workflowKey => ({
    //                 workflow: workflowKey,
    //                 operation: ((((config.payload || {}).mailing || {}).next_operation || {}).selector || {}).operation || ""
    //               }))
    //             },
    //           },
    //           condition: {
    //             data: "integration_options:option:$user_index",
    //             type: "redis",
    //             rkey_type: "array_item",
    //             vars: {
    //               user_index: {
    //                 data: "get_integration_selection:message_data:message:body",
    //                 type: "redis",
    //                 rkey_type: "hash_map",
    //                 default: {
    //                   data: "0",
    //                   type: "raw"
    //                 }
    //               }
    //             }
    //           }
    //         }
    //       },
    //       // rb_internal_key_17 oy3m63KISNrwno19wxHD
    //       {
    //         type: "Operation",
    //         selector: {
    //           workflow: config.selector.workflow,
    //           app: "whatsapp",
    //           app_action: "send_message"
    //         },
    //         key: "rb_internal_key_17",
    //         output: {
    //           operation_type: "drop_session"
    //         },
    //         payload: {
    //           content: {
    //             data: "missing_integration",
    //             type: "get_by_lang"
    //           },
    //           userFsId: {
    //             data: "User.Id",
    //             type: "struct"
    //           }
    //         }
    //       }
    //     ]

    //     // define uuidMap
    //     let uuidMap = {}
    //     for (let i = 1; i <= 17; i++) {
    //       const suffix = i === 16 ? "_last_op" : ""
    //       uuidMap[`rb_internal_key_${i}`] = `__rb_internal_${uuidv4().replace(/-/g, "_")}_releai_active_integrations${suffix}`
    //     }

    //     const formatOperation = (operation, uuidMap) => {
    //       Object.keys(operation).forEach(key => {
    //         // replace keys
    //         if (typeof operation[key] === "string") {
    //           if (operation[key].includes("rb_internal_key_")) {
    //             const [keyIndex] = /(?!x)\d+/.exec(operation[key])
    //             const replacedString = operation[key].replace(`rb_internal_key_${keyIndex}`, uuidMap[`rb_internal_key_${keyIndex}`])
    //             operation[key] = replacedString
    //           }
    //         }

    //         if (typeof operation[key] === "object") {
    //           formatOperation(operation[key], uuidMap)
    //         }
    //       })
    //     }

    //     baseOperations.forEach(operation => {
    //       formatOperation(operation, uuidMap)
    //     })
    //   }

    //   item.ungroup = [...baseOperations]

    //   return item
    // }
  ].map(fn => fn())
}
