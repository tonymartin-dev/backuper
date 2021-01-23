

function getParams(args) {
    const params = {}
    args.forEach(arg => {
        const argArray = arg.replace('--', '').split('=')
        params[argArray[0]] = argArray[1] || true
    })
    console.log('args', params)
    return params
}

function translateParams(args) {
    const params = getParams(args)

    if(params.cron){
        return params.cron
    } else if (params.at){

    } else if (params.every) {
        return `${params.seconds || '*'} ` +
            `${params.minutes || '*'} ` + 
            `${params.hours || '*'} ` + 
            `${params.days || '*'} ` +
            `${params.months || '*'} ` +
            `${params.dayName || '*'}` 
    }
    
}


exports.translateParams = translateParams