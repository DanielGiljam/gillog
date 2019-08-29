const chalk = require("chalk")

function colorServerSideLogPrefix(level, name, timestamp) {
    const colors = {TRACE: chalk.magenta, DEBUG: chalk.cyan, INFO: chalk.blue, WARN: chalk.yellow, ERROR: chalk.red}
    timestamp = chalk.gray(`[${timestamp}]`)
    level = colors[level](level)
    name = chalk.green(`${name}:`)
    return `${timestamp} ${level} ${name}`
}

module.exports = colorServerSideLogPrefix
