const BaseCommand =  require('../../src/utils/base-command')
const {expect, test} = require('@oclif/test')
const path = require('path')
const fs = require('fs')
const refresh_token = "ACzBnCgyZafR_GBdzEhwtX2p8c9HtTYQiYhljVjqP-mjpvUD5JXeYcZHzo8GETvmTdMjvtDoTC5GdInt20Q3nfXAmaiFwj0ofRs4mdOn_3rEsTbNlaLSgS2bYdfwJi2X5XmLdsfgEEEWuE95O9ZXXG0c-20JEexkniLppmwna2FR4Qw-MqxFxp2hL6gjg50eS8FDqQvYOWOcUiFNu00K2LnIn6iEammClVUZZA1AjlQs14dWd1vAKFs"

process.env.NODE_ENV = "development"

describe('Testing apply and delete commands with the tokens combination', () => {

  //remove creds.json if exists
  if(fs.existsSync(BaseCommand.CREDS_PATH)){
    fs.unlinkSync(BaseCommand.CREDS_PATH)
    console.log("creds.json is deleted")
  }

  test
  .stdout()
  .command(['apply','-f',path.join(__dirname,'example.yaml'),'-T',refresh_token])
  .it('Should apply configuration file using the refresh token', ctx => {
    expect(ctx.stdout).to.equal('')
  })

  test
  .stdout()
  .command(['app:delete','example_app','-T',refresh_token])
  .it('Should delete configuration file using the refresh token', ctx => {
    expect(ctx.stdout).to.equal('')
  })
})
