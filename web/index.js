const path = require("path")
const express = require("express")
const renders = require("./renders")
const { validateCode } = require("./utils")
const mustacheExpress = require("mustache-express")

// init express app
const app = express()

app.use(express.static("public"))

app.set("view engine", "mustache")
app.set("views", path.join(__dirname, "./views"))
app.engine("mustache", mustacheExpress())

// server webpage
app.use((req, res) => {
    // validate the code and check refresh token
    const refreshToken = validateCode(req.query.code)

    // return render page
    res.render("index", refreshToken ? renders.success : renders.error)
})

// listen on port 9091
app.listen(9091)
