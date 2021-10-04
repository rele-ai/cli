const DeleteCommand =  require("../../src/commands/app/delete")
const ApplyCommand = require("../../src/commands/apply")
const path = require('path')
const axios = require("axios")

process.env.NODE_ENV = "development"



describe('Testing apply and delete commands with the tokens combination', () => {
  let rToken

  // get the token
  beforeAll(async () => {
    const headers = {
      'Content-Type': 'application/json',
    };
    //TODO - Put here a valid rele.ai email, and a valid password
    const payload ={ "email": "qa@rele.ai", "password": "Aa123456!", "returnSecureToken" : true }
    const { data } = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.RELEAI_FS_API_KEY}`, payload, headers)
    rToken = data.refreshToken
    console.log(rToken)
  })

  test('should apply example.yaml', async () => {
		await ApplyCommand.run(['-f',path.join(__dirname,'example.yaml'), '-T',rToken])
	});

  test("should delete example_app", async () => {
    await DeleteCommand.run(['example_app','-T',rToken])
  })
})
