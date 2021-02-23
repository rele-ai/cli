const uuidv4 = require("uuid").v4
const { docListToObj } = require("@releai/cli/src/utils")
const { WorkflowsClient, OperationsClient } = require("@releai/cli/lib/components")

module.exports = async (config, { accessToken }) => {
    const operations = docListToObj((await (new OperationsClient(accessToken).list())))
    const workflows = docListToObj((await (new WorkflowsClient(accessToken).list())))

    return [
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
                    return {
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
                    }
                }
            }

            baseOperation.next_operation.selector.forEach((selector) => {
                item.ungroup.push({
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
                })
            })

            return item
        }
    ].map(fn => fn())
}
