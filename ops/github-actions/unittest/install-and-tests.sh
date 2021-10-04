## /bin/bash
## this script checkes if the service wrote in node or with go
## according to path file and what's his lang
## $1=PACKAGES_TOKEN
## $2=$SERVICE\PACKAGE Name
## $3=releai-bot-dev.json
## $4=releai-bot-prod.json
## $5=kind(src/package)
##########################################################################################
if [[ "$KIND" == "packages" ]]; then
  cd $GITHUB_WORKSPACE/packages/$PACKAGE/
  bash test.sh
fi

