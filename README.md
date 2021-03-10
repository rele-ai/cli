@releai/cli
===========
[![Version](https://img.shields.io/npm/v/@releai/cli.svg)](https://npmjs.org/package/@releai/cli)
[![Downloads/week](https://img.shields.io/npm/dw/@releai/cli.svg)](https://npmjs.org/package/@releai/cli)
[![License](https://img.shields.io/npm/l/@releai/cli.svg)](https://github.com/rele-ai/cli/blob/master/package.json)

RELE.AI CLI Tool provides an easy interface to create and manage integrations with the RELE.AI system.

Through the cli tool you can create different workflow for your organization, and create an interface between your application and RELE.AI.

Visit RELE.AI [documantation](https://docs.rele.ai) for more information!

## Authentication
### Login to CLI Tool
```sh
rb auth:login
```

### Logout from CLI Tool
```sh
rb auth:logout
```

For additional info run `rb auth --help`
```sh
Manage the authorization session to RELE.AI

USAGE
  $ rb auth:COMMAND

DESCRIPTION
  ...
  Manage the credentials to access RELE.AI workflows and apps.


COMMANDS
  auth:login   Manage the authorization session to RELE.AI
  auth:logout  Manage the authorization session to RELE.AI
```

## Create Hello-World Application
```sh
rb create hello-world -t rele-ai/hello-world-integration-template#main
```

You can edit the configuration files under `$RB_PROJECT_PATH/configs/*.yaml`.

For additional info run `rb create --help`
```sh
Create a RELE.AI integration project from a template

USAGE
  $ rb create PATH

ARGUMENTS
  PATH  Project location path

OPTIONS
  -c, --clone              Use git clone
  -t, --template=template  (required) Path to a git repository with the template

DESCRIPTION
  ...
  Please read more in our documentation website at docs.rele.ai
```

## Deployment
After editing configuration files, you can run the deploy command, at the organization level or the user level.

Deploy for specific users given emails argument seperated by comma:
```sh
rb deploy:user -e [USER_EMAILS]
```
Deploy for organization:
```sh
rb deploy:org
```

For additional info run `rb deploy --help`
```sh
Deploy your integration and configurations to an org level.

USAGE
  $ rb deploy:COMMAND

DESCRIPTION
  ...
  Please read more about the deployment process here: https://docs.rele.ai/guide/cli-development.html#rb-deploy-org


COMMANDS
  deploy:org   Deploy your integration and configurations to an org level.
  deploy:user  Deploy your integration and configurations to an user level.
```
