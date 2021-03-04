@releai/cli
===========

RELE.AI CLI Tool

[![Version](https://img.shields.io/npm/v/@releai/cli.svg)](https://npmjs.org/package/@releai/cli)
[![Downloads/week](https://img.shields.io/npm/dw/@releai/cli.svg)](https://npmjs.org/package/@releai/cli)
[![License](https://img.shields.io/npm/l/@releai/cli.svg)](https://github.com/rele-ai/cli/blob/master/package.json)

```
// create a new project from source template & format
[x] rb create [PROJECT_NAME] [--template,-t {github link}]

// generate refresh token and stores in ~/.rb/token
[x] rb auth:login
[x] rb auth:logout

// list of all activate versions
[] rb versions

// tail logs from all services
[] rb logs [--tail,-t]

// push dev version only for user
// NOTE: `rb push` calls an internal deployment script for
// the user's integrations
[] rb push [VERSION=latest] [--reset]

// do `rb push` and `rb workflow activate`
// NOTE: set git tag
[] rb deploy [VERSION]

// manage workflows
[] rb workflow list
[] rb workflow get [WORKFLOW_ID] [--output,-o {path}, --format,-f {format}]
[] rb workflow delete [WORKFLOW_ID]
[] rb workflow activate [WORKFLOW_ID]
[] rb workflow deactivate [WORKFLOW_ID]

// manage apps
[] rb app list
[] rb app get [APP_ID] [--output,-o {path}, --format,-f {format}]
[] rb app delete [APP_ID]

// manage translations
[] rb translation list [--output,-o {path}, --format,-f {format}]
[] rb translation get [TRANSLATION_ID] [--output,-o {path}, --format,-f {format}]
[] rb translation delete [TRANSLATION_ID]
[] rb translation import [--file,-f {path}]

// manage yamls
[] rb apply --file,-f {path}
[] rb delete --file,-f {path}
[] rb validate --file,-f {path}
```
