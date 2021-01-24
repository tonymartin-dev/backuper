const getParams = (args) => {
    const params = {}
    args.forEach(arg => {
        const argArray = arg.replace('--', '').split('=')
        params[argArray[0]] = argArray[1] || true
    })
    console.log('args', params)
    return params
}

const translateParams = (args) => {
    const params = getParams(args)

    if(params.cron){
        return params.cron
    } else if (params.every){
        const sec = params.seconds ? `*/${params.seconds} ` : '* '
        const min = params.minutes ? `*/${params.minutes} ` : '* '
        const hrs = params.hours ? `*/${params.hours} ` : '* '
        const days = params.days ? `*/${params.days} ` : '* '
        const months = params.months ? `*/${params.months} ` : '* '
        const wkd = params.weekDay ? `*/${params.weekDay} ` : '* '
        return sec + min + hrs + days + months + wkd
    } else if (params.at) {
        return `${params.seconds || '*'} ` +
            `${params.minutes || '*'} ` + 
            `${params.hours || '*'} ` + 
            `${params.days || '*'} ` +
            `${params.months || '*'} ` +
            `${params.weekDay || '*'}` 
    }
    
}

const getFileContainer = (filePath) => {
    const pathArray = filePath.split('/')
    pathArray.pop()
    return pathArray.join('/')
}

exports.translateParams = translateParams
exports.getFileContainer = getFileContainer