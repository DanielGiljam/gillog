function colorClientSideLogPrefix(logger, loglevelPrefix) { // TODO: add possibility to customize styles

    // Configuring the prefix plugin for the client-side logger instance
    loglevelPrefix.apply(logger, {
        timestampFormatter: date => date.toLocaleString(),
        format: (level, name, timestamp) => `%c[${timestamp}] %c${level} %c${name}:%c`
    })

    // Postponing styles to enable colored log message prefixes client-side
    const originalFactory = logger.methodFactory
    logger.methodFactory = (methodName, logLevel, loggerName) => {
        const rawMethod = originalFactory(methodName, logLevel, loggerName)

        const colors = {trace: "magenta", debug: "cyan", info: "blue", warn: "yellow", error: "red"}

        const timestampColor = ``
        const levelColor = `font-weight: bold; color: ${colors[methodName]}`
        const nameColor = `font-weight: bold; color: green`
        const messageColor = ``

        return (message, ...messages) => {
            if (typeof message === "string") {
                rawMethod(message, timestampColor, levelColor, nameColor, messageColor, ...messages)
            } else {
                rawMethod("", timestampColor, levelColor, nameColor, messageColor, message, ...messages)
            }
        }
    }
    logger.setLevel(logger.getLevel())

    // Marking logger as initialized
    logger.initialized = true

    // Returning the client-side logger
    return logger
}

module.exports = colorClientSideLogPrefix
