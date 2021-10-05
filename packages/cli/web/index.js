const os = require("os")
const fs = require("fs")
const path = require("path")
const express = require("express")
const renders = require("./renders")
const { validateCode } = require("./utils")
const mustacheExpress = require("mustache-express")
const credsPath = path.join(os.homedir(), ".rb")

/**
 * Check if creds are existed , if not write them again
 */
const checkCreds = async (token, ciServer) => {
  let fullPath = path.join(credsPath, "creds.json")
  try {
    if (!ciServer && !fs.existsSync(fullPath)) {
      // write creds
      fs.writeFileSync(fullPath, JSON.stringify(token))
    }
  } catch(err) {
    console.error("Error when trying to write creds", err)
  }
}
/**
 * Routing handler helper
 * @param {boolean} ciServer indicates if the connection is through a ci server
 * @param {object} req - request obj
 * @param {object} res - request res
 * @param {string} state - state number for validation propose
 */
const handler = async (ciServer, req, res, state) => {
    // validate state
    try {
      if (Number(req.query.state) === Number(state)) {
        // validate the code and check refresh token
        const token = await validateCode(req.query.code)
        // process refresh token
        if (token) {
          await checkCreds(token, ciServer)

          // return render page
          res.render("index", renders.success)

          setTimeout(() => {
            if (ciServer)
                console.log(`Success! Use this token to login on a CI server:\n\n${token.refresh_token}\n\nExample: rb deploy -T ${token.refresh_token}\n\n`)
            process.exit(0)
          }, 2000)
          return
        }
      }
    } catch (err) {
        console.error("unable to get refresh token", err)
        // return error
        res.render("index", renders.error)
        setTimeout(() => {
          process.exit(1)
        }, 2000)
    }
}
const start = ({ state }) => {
  // init express app
  const app = express()

  // write refresh token

  if (!fs.existsSync(credsPath)) {
    fs.mkdirSync(credsPath)
  }

  app.use(express.static(path.join(__dirname, "public")))

  app.set("view engine", "mustache")
  app.set("views", path.join(__dirname, "./views"))
  app.engine("mustache", mustacheExpress())


//server ci page
  app.use("/ci", async (req, res) => {

    await handler(true, req, res, state)

  })

  // server webpage
  app.use("/", async (req, res) => {

    await handler(false, req, res, state)

  })

  // listen on port 9091
  app.listen(9091)

  // return app instance
  return app
}

// export start script
module.exports.start = start

// start server from command line
if (require.main === module) {
  start()
}
