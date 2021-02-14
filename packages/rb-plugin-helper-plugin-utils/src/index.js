const fs = require("fs")

// load all modules
fs.readdirSync(__dirname)
	.filter((filename) => {
		// check if file should be loaded
		if (filename !== "index.js" && /\.js$/g.test(filename)) {
			module.exports[filename.replace(/\.js/g, "")] = require(`${__dirname}/${filename}`)
		}
	})
