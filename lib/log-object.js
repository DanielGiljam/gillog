const chalk = require("chalk")

const parseLevel = require("./parse-level")

function logObject(level, object, currentLevel) {
    const suppress = parseLevel(level) < parseLevel(currentLevel)
    level = parseLevel(level, "string")
    if (level === "SILENT") throw TypeError("Cannot log object with level `silent`.")
    return (suppress) ? chalk.yellowBright(`*set loglevel to \`${level}\` to render object*`) : `\n\n${JSON.stringify(object, undefined, 2)}\n`
}

module.exports = logObject
