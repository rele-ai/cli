const fs = require("fs")
const os = require("os")
const path = require("path")

// global constansts
const RB_DIR = `${os.homedir()}/.rb`
const CONFIG_DIR = `${RB_DIR}/configs`
const LOCAL_CONFIG_DIR = path.join(__dirname, "..", "files", "configs")

/**
 * Run the copy configs script
 */
const run = () => {
  // create configs dir in .rb folder
  if (!fs.existsSync(CONFIG_DIR)) {
    // create config dir if missing
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }

  // copy files
  fs.copyFileSync(`${LOCAL_CONFIG_DIR}/.rbc.js`, `${CONFIG_DIR}/.rbc.js`)
}

// execute script
run()
