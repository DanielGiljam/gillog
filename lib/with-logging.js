const loglevel = require("loglevel")

function withLogging(Component, getIsomorphicLogger) {
    function ComponentWithLogging(props) {

        // Component's name
        const name = Component.name

        // Providing a logger with its own namespace for the component
        const logger = getIsomorphicLogger(name)

        // Setting the log level of the component's logger
        if (props.level) logger.setLevel(props.loglevel)

        // Managing any local loggers under the component's namespace
        const loggers = loglevel.getLoggers()
        for (const loggerName in loggers) if (loggerName.indexOf(name) === 0) loggers[loggerName].setLevel(logger.getLevel())

        // Defining a method so that the component can summon local loggers under its namespace
        logger.getLocalLogger = function getLocalLogger(localName) {
            return loglevel.getLogger(`${name} ${localName}`)
        }
        return Component({log: logger, ...props})
    }

    for (const key in Component) if (Component.hasOwnProperty(key)) {
        ComponentWithLogging[key] = Component[key]
    }

    ComponentWithLogging.propTypes = {
        /**
         * Sets the log level of the component. If none is provided, an attempt is made at acquiring the log level of the root logger.
         * Either a log level name or 'silent' (which disables everything) in one of a few forms:
         *
         * - As a log level from the internal levels list, e.g. log.levels.SILENT
         * - As a string, like 'error' (case-insensitive)
         * - As a numeric index from 0 (trace) to 5 (silent)
         *
         * See <a href="https://github.com/pimterry/loglevel" target="_blank">loglevel – minimal lightweight logging for JavaScript</a>
         */
        loglevel: function (props, propName, componentName) {
            console.log()
            if (props[propName] && !/^([0-5]|trace|debug|info|warn|error|silent)?$/i.test(props[propName])) {
                throw new Error(`Invalid prop \`${propName}\` supplied to \`${componentName}\`. Validation failed.`)
            }
        },
        ...(Component && Component.propTypes ? Component.propTypes : [])
    }

    return ComponentWithLogging
}

module.exports = withLogging
