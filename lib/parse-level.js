const loglevel = require("loglevel")

function parseLevel(level, returnType) {
    const error = new TypeError(`\`${level}\` is not a log level`)
    let levelAsString, levelAsNumber
    switch (typeof level) {
        case "number":
            for (const key in loglevel.levels) {
                if (loglevel.levels.hasOwnProperty(key) && loglevel.levels[key] === level) {
                    levelAsString = key
                    levelAsNumber = level
                }
            }
            break
        case "string":
            levelAsString = level.toUpperCase()
            levelAsNumber = loglevel.levels[levelAsString]
            break
    }
    if (levelAsString == null || levelAsNumber == null) throw error
    return (returnType === "string") ? levelAsString : levelAsNumber
}

module.exports = parseLevel
