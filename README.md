@releai/cli
===========

RELE.AI CLI Tool

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@releai/cli.svg)](https://npmjs.org/package/@releai/cli)
[![Downloads/week](https://img.shields.io/npm/dw/@releai/cli.svg)](https://npmjs.org/package/@releai/cli)
[![License](https://img.shields.io/npm/l/@releai/cli.svg)](https://github.com/rele-ai/cli/blob/master/package.json)

<!-- notes -->
rb auth login
rb auth logout

rb workflow list
rb workflow get $id -o

rb workflow activate $id
rb workflow deactivate $id

rb app list -> lists user's apps and global apps
rb app get $id

rb apply $path_to_file
rb delete $path_to_file
rb validate $path_to_file

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @releai/cli
$ rb COMMAND
running command...
$ rb (-v|--version|version)
@releai/cli/0.1.0 darwin-x64 node-v15.2.1
$ rb --help [COMMAND]
USAGE
  $ rb COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`rb auth`](#rb-auth)
* [`rb workflow`](#rb-workflow)
* [`rb app`](#rb-app)
* [`rb apply`](#rb-apply)
* [`rb delete`](#rb-delete)
* [`rb validate`](#rb-validate)
* [`rb help [COMMAND]`](#rb-help-command)

## `rb auth`

```
USAGE
  $ rb auth login

DESCRIPTION
  ...
  Login via SSO through the RELE.AI platform
```

```
USAGE
  $ rb auth logout

DESCRIPTION
  ...
  Revokes the session
```

## `rb workflow`

```
USAGE
  $ rb workflow list

DESCRIPTION
  ...
  Revokes the session
```

## `rb help [COMMAND]`

```
USAGE
  $ rb help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```
<!-- commandsstop -->
