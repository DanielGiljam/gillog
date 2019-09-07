const loglevel = require("loglevel")
const loglevelPrefix = require("loglevel-plugin-prefix")

const colorServerSideLogPrefix = require("./lib/color-server-side-log-prefix")
const colorClientSideLogPrefix = require("./lib/color-client-side-log-prefix")
const getSpinner = require("./lib/get-spinner")
const logObject = require("./lib/log-object")
const trafficLogger = require("./lib/traffic-logger")
const withLogging = require("./lib/with-logging")
const parseLevel = require("./lib/parse-level")

// Registering the prefix plugin
loglevelPrefix.reg(loglevel)

function getServerSideLogger(name) {

    // Creating an instance of a server-side logger
    const logger = loglevel.getLogger(name)

    // Setting the log level
    const level = process.env.LOGLEVEL
    logger.setLevel(level ? level : loglevel.levels.WARN)

    // Configuring the prefix plugin for the server-side logger instance
    loglevelPrefix.apply(logger, {
        timestampFormatter: function (date) {
            return date.toLocaleString(process.env.LOCALE)
        },
        format: function () {
            return colorServerSideLogPrefix(...arguments)
        }
    })

    // References to the functions that will be wrapped in methods of the logger object that will be returned
    const getSpinnerFunc = getSpinner
    const logObjectFunc = logObject

    // Injecting `throwError`, `getSpinner`, `logObject` methods to the logger object that is being returned
    logger.throwError = function throwError(error, options) {
        if (error instanceof Error) {
            logger.error(error.stack)
            if (options && options.crash) process.exit(1)
        } else {
            logger.error(...arguments)
        }
    }
    logger.getSpinner = function getSpinner(level, message) {
        return getSpinnerFunc(level, name, new Date().toLocaleString(process.env.LOCALE), message, logger.getLevel())
    }
    logger.logObject = function logObject() {
        if (arguments.length === 2) {
            const [level, object] = arguments
            return logObjectFunc(level, object, logger.getLevel())
        }
        const [level, message, object] = arguments
        return logger[parseLevel(level, "string").toLowerCase()](message, logObjectFunc(level, object, logger.getLevel()))
    }
    return logger
}

function getClientSideLogger(name) {

    // Creating an instance of a client-side logger
    const logger = loglevel.getLogger(name)

    // Setting the log level
    const level = process.env.LOGLEVEL
    logger.setLevel(level ? level : loglevel.levels.WARN)

    // Returning the logger via a function that sets it up with colored log prefixing
    if (!logger.initialized) return colorClientSideLogPrefix(logger, loglevelPrefix)
    else return logger
}

function getIsomorphicLogger(name, getServerSideLogger, getClientSideLogger) {

    // Determining environment
    const isServerSide = new Function("try {return this===global}catch(e){return false}")()

    // Making sure name isn't `undefined` and giving it a suitable default value based on environment
    if (!name) name = (isServerSide) ? "server" : "client"

    // Creating loggers for both environments
    let isomorphic
    const server = getServerSideLogger(`${name} [server]`)
    const client = getClientSideLogger(`${name} [client]`)

    // Muting the environment exclusive counterpart based on the current environment
    if (isServerSide) {
        isomorphic = getServerSideLogger(name)
        client.setLevel(client.levels.SILENT)
    } else {
        isomorphic = getClientSideLogger(name)
        server.setLevel(server.levels.SILENT)
    }

    // Returning a logger that logs in both environments that contains
    // logger that log only in one environment, and not the other
    isomorphic.server = server
    isomorphic.client = client
    return isomorphic
}

module.exports = {
    serverSide: (() => {
        const serverSide = getServerSideLogger("server")
        serverSide.getLogger = name => getServerSideLogger(name)
        return serverSide
    })(),
    clientSide: (() => {
        const clientSide = getClientSideLogger("client")
        clientSide.getLogger = name => getClientSideLogger(name)
        return clientSide
    })(),
    isomorphic: {
        ...getIsomorphicLogger(null, getServerSideLogger, getClientSideLogger),
        getLogger(name) {
            return getIsomorphicLogger(name, getServerSideLogger, getClientSideLogger)
        }
    },
    trafficLogger,
    withLogging: Component => withLogging(
        Component,
        name => getIsomorphicLogger(
            name,
            getServerSideLogger,
            getClientSideLogger
        )
    )
}
