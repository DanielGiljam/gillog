const ora = require("ora")

const colorServerSideLogPrefix = require("./color-server-side-log-prefix")
const parseLevel = require("./parse-level")

function getSpinner(level, name, date, message, currentLevel) {
    const suppress = parseLevel(level) < parseLevel(currentLevel)
    level = parseLevel(level, "string")
    if (level === "SILENT") throw TypeError("Cannot set level `silent` to spinner.")
    const prefixText = colorServerSideLogPrefix(level, name, date)
    const spinner = ora({
        prefixText: `${prefixText} ${message}`,
        spinner: "simpleDotsScrolling",
        color: "white"
    })
    return {
        start() {
            if (!suppress) spinner.start()
            return this
        },
        succeed() {
            if (!suppress) spinner.stopAndPersist({symbol: "..."})
            return this
        },
        fail(message) {
            if (!suppress) {
                spinner.fail()
                const prefixText = colorServerSideLogPrefix("ERROR", name, date)
                spinner.prefixText = `${prefixText} ${message}`
            }
            return this
        },
        info(message) {
            if (!suppress) {
                spinner.info()
                const prefixText = colorServerSideLogPrefix(level, name, date)
                spinner.prefixText = `${prefixText} ${message}`
            }
            return this
        },
        isSpinning() {
            return spinner.isSpinning
        }
    }
}

module.exports = getSpinner
