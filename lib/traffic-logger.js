const chalk = require("chalk")
const highlight = require("cli-highlight").highlight

const highlightTheme = {
    addition: chalk.white,
    attr: chalk.white,
    attribute: chalk.white,
    built_in: chalk.white,
    "builtin-name": chalk.white,
    bullet: chalk.white,
    class: chalk.white,
    code: chalk.white,
    comment: chalk.gray,
    default: chalk.white,
    deletion: chalk.white,
    doctag: chalk.white,
    emphasis: chalk.white,
    formula: chalk.white,
    function: chalk.white,
    keyword: chalk.greenBright,
    link: chalk.white,
    literal: chalk.cyan,
    meta: chalk.white,
    "meta-keyword": chalk.white,
    "meta-string": chalk.white,
    name: chalk.white,
    number: chalk.cyan,
    params: chalk.white,
    quote: chalk.white,
    regexp: chalk.white,
    section: chalk.white,
    selectorAttr: chalk.white,
    "selector-class": chalk.white,
    "selector-id": chalk.white,
    "selector-pseudo": chalk.white,
    "selector-tag": chalk.white,
    string: chalk.yellowBright,
    strong: chalk.white,
    subst: chalk.white,
    symbol: chalk.white,
    tag: chalk.white,
    "template-tag": chalk.white,
    "template-variable": chalk.white,
    title: chalk.white,
    type: chalk.white,
    variable: chalk.white
}

function capHeaderName(headerName) {
    return headerName.replace(/^\w|-\w/g, (cap) => cap.toUpperCase())
}

function prettyPrintBody(message) {
    if (parseInt(message.get("Content-Length")) < 100000) {
        if (typeof message.body === "object") {
            message.body = `\n\n${JSON.stringify(message.body, undefined, 2)}\n`
            return highlight(message.body, {language: "json", theme: highlightTheme})
        } else {
            return highlight(`\n\n${message.body}\n`, {theme: highlightTheme})
        }
    } else {
        return `\n\n${chalk.bgWhiteBright.black(`body not rendered as it exceeds 100kB in size`)}\n` // TODO: add feature that dumps unusually large request bodies into files
    }
}

function highlightURL(url) {
    const urlCharRange = "a-z0-9$_.+!*‘()-" // according to https://www.abramillar.com/2018/01/15/special-characters-short-words-urls/ [2019-08-11]
    const matchUrlPathAndQuery = `^(\\/(?:[${urlCharRange}]+\\/?)*(?=\\?|$)\\??)((?:[${urlCharRange}]+(?:=[${urlCharRange}]*)?(?:&|$))*)$`
    const matchQueryParamsAndValues = `((^[${urlCharRange}]*|[${urlCharRange}]+)=?)([${urlCharRange}]*)(&|$)`
    const highlightQuery = string => string.replace(new RegExp(matchQueryParamsAndValues, "gi"), (substr, m1, m2, m3, m4) => {
        return`${(m1 === m2)?chalk.cyan(m1):chalk.white(m1)}${chalk.cyan(m3)}${chalk.white(m4)}`
    })
    const highlightedUrl = url.replace(new RegExp(matchUrlPathAndQuery, "i"), (substr, m1, m2) => {
        return `${chalk.white(m1)}${highlightQuery(m2)}`
    })
    if (url === highlightedUrl) return chalk.bgBlackBright.red.bold(url)
    return highlightedUrl
}

function prettyPrintRequest(log, req) {
    let prettyPrintedRequest = `\n\n${chalk.bgWhiteBright.black(req.method)} ${highlightURL(req.originalUrl)} ${chalk.gray(`HTTP/${req.httpVersion}`)}`
    for (const headerName in req.headers) {
        if (req.headers.hasOwnProperty(headerName)) {
            if (headerName === "user-agent") {
                prettyPrintedRequest += `\n  ${chalk.white(`${capHeaderName(headerName)}:`)}`
                prettyPrintedRequest += `\n    ${chalk.yellowBright(req.headers[headerName].replace(/ (?![^(]+\))/g, "\n    "))}`
            } else prettyPrintedRequest += `\n  ${chalk.white(`${capHeaderName(headerName)}:`)} ${chalk.yellowBright(req.headers[headerName])}`
        }
    }
    prettyPrintedRequest += prettyPrintBody(req) // TODO: parse GraphQL queries, so that they also get printed prettily to the console
    return prettyPrintedRequest
}

function prettyPrintResponse(log, res) {
    const matchHTTPVer = "HTTP\\/\\d\\.\\d"
    const matchStatusCode = "\\d{3}"
    const matchStatusMessage = "(?:\\w+ ?)+"
    const matchHeaders = "(?:.+(?:\\r\\n(?!\\r\\n))?)+"
    const highlightStatusCode = string => {
        const code = parseInt(string)
        switch (true) {
            case code >= 400:
                return chalk.bgRedBright.whiteBright(string)
            case code >= 300:
                return chalk.bgMagentaBright.whiteBright(string)
            case code >= 200:
                return chalk.bgGreen.whiteBright(string)
            case code >= 100:
                return chalk.bgCyanBright.whiteBright(string)
        }
    }
    const highlightHeaders = string => string.replace(new RegExp(`([a-z-]+:) (.*)`, "gi"), (substr, m1, m2) => {
        return `  ${chalk.white(m1)} ${chalk.yellowBright(m2)}`
    })
    // noinspection JSUnresolvedVariable --> this variable exists
    return res._header.replace(new RegExp(`^(${matchHTTPVer}) (${matchStatusCode}) (${matchStatusMessage})\\r\\n(${matchHeaders})(\\r\\n)*`), (substr, m1, m2, m3, m4) => {
        return `\n\n${chalk.gray(m1)} ${highlightStatusCode(m2)} ${chalk.white(m3)}\n${highlightHeaders(m4)}${prettyPrintBody(res)}`
    })
}

function logRequest(log, req) {
    let reqDebug = `Incoming request from ${chalk.magentaBright(req.ip)}`
    if (log.getLevel() === log.levels.TRACE) reqDebug += prettyPrintRequest(log, req)
    log.debug(reqDebug)
}

function logResponse(log, res) {
    getResponseBody(res)
    res.on("finish", () => {
        let resDebug = `Dispatched response to ${chalk.magentaBright(res.req.ip)}`
        if (log.getLevel() === log.levels.TRACE) resDebug += prettyPrintResponse(log, res)
        log.debug(resDebug)
    })
}

function getResponseBody(res) {
    // Solution based on Sid's answer: https://stackoverflow.com/questions/52310461/node-js-express-how-to-log-the-request-body-and-response-body [2019-08-21]
    const chunks = []
    const write = res.write
    const end = res.end
    res.write = (...restArgs) => {
        chunks.push(Buffer.from(restArgs[0]))
        write.apply(res, restArgs)
    }
    res.end = (...restArgs) => {
        if (restArgs[0]) chunks.push(Buffer.from(restArgs[0]))
        if (parseInt(res.get("Content-Length")) < 100000) {
            const body = Buffer.concat(chunks).toString('utf8')
            try {
                res.body = JSON.parse(body)
            } catch(error) {
                res.body = body
            }
        }
        end.apply(res, restArgs)
    }
}

module.exports= function getTrafficLogger(log) {
    return function trafficLogger(req, res, next) {
        logRequest(log, req)
        logResponse(log, res)
        next()
    }
}
