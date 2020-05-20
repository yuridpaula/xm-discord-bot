const { Client, Attachment } = require('discord.js');

let logger = require('winston')
let auth = require('../auth.json')
let basics = require("./basics.json")
let constants = require("./constants.json")
let stMessages = require('./storyTellerMessages.json')

//the require iniciate the server automatic
let server = require('./app/server.js')

//singleton instance of data
let general = require('./app/models/generalModel')

//for not cache of print image
const moment = require('moment')

// for jobs implementation
const CronJob = require('./node_modules/cron/lib/cron.js').CronJob;

/*************************************************** initialization ***************************************************/
// logger configuration
logger.remove(logger.transports.Console)
logger.add(logger.transports.Console, {
    colorize: true
})
logger.level = 'debug'

// initialize bot
let client = new Client()
client.login(auth.token)

//initialization validation
client.on('ready', (event) => {
    logger.info(`${client.user.tag} Conectado!!`)
})

/*************************************************** messages control ***************************************************/

//listener of messages server
client.on('message', (msg) => {
    try {
        //specific channel messages
        sendSpecificChannelMessage(msg)

        //verify mentions
        if (msg.mentions.members.first() !== undefined) {
            //mentions collections without bot mention
            let mentions = msg.mentions.users.filter(f => f.id !== client.user.id)

            //compare both for identify bot mentions
            if (mentions.size !== msg.mentions.users.size) {

                let args = reoganizeContent(msg.content)

                //verify basic text
                let txt = basics[args[1]]

                if (txt !== undefined) {
                    txt = constants.initialText + txt

                    txt = replaceConstants(txt, mentions)

                    msg.channel.send(txt)
                        /*.then((message) => {
                            setTimeout(() => {
                                message.delete()
                            }, constants.millisToDeleteBotMessage)
                        })*/

                } else if (args[1] === 'imagem') {

                    msg.channel.send(new Attachment(`./imagens/${args[2]}.png`))
                        /*.then((message) => {
                            setTimeout(() => {
                                message.delete()
                            }, constants.millisToDeleteBotMessage)
                        })*/
                } else if (args[1] === 'print') {
                    //const url = `https://ashita.com.br/xmprint?t=${moment().format()}`
                    const url = 'Foi mal galera, o print encontra-se temporariamente desabilitado'
                    msg.channel.send(url)
                }

                //delete message that triggered the bot
                msg.delete()
            }
        }
    } catch (e) {
        logger.info('Error on client.on(message)\n' + e)
    }
})


//listener for specific channel
function sendSpecificChannelMessage(msg) {
    //gainLoss channel
    if (msg.channel.id === constants.gainLossChannel && msg.author.id !== client.user.id && constants.canSendGainLoss) {

        let args = reoganizeContent(msg.content)

        let onlyNumbers = false
        let hasCorretora = false
        let hasCloud = false
        let hasPontos = false
        let hasSet = false

        args.forEach((a) => {
            onlyNumbers = onlyNumbers || (a.match(/\d+/g) !== null)
            hasCorretora = hasCorretora || a.toString().toLowerCase() === 'corretora'
            hasCloud = hasCloud || a.toString().toLowerCase() === 'cloud'
            hasPontos = hasPontos || a.toString().toLowerCase() === 'pontos'
            hasSet = hasSet || a.toString().toLowerCase() === 'set'
        })

        if (!(onlyNumbers && //Some word with only number
                hasCorretora && // The word 'corretora' in the message
                hasCloud && // The word 'cloud' in the message
                hasPontos && // The word 'pontos' in the message
                hasSet) // The word 'set' in the message
        ) {
            let txt = constants.initialText + basics['pattern-gain-loss']

            //specific author mention
            txt = txt.replace('{user}', `<@${ msg.author.id}>`)

            txt = replaceConstants(txt)

            msg.channel.send(txt)
                .then((message) => {
                    setTimeout(() => {
                        message.delete()
                    }, constants.millisToDeleteBotMessage)
                })

            msg.delete()
        }
    }
}

/*************************************************** Auxiliary functions ***************************************************/
//update of constants
function replaceConstants(txt, mentions) {
    constants.replaceConsts.forEach((c) => {
        txt = txt.replace(c, constants[c])
    })

    //user mention
    let user = ''

    if (mentions !== undefined)
        if (mentions.size == 1) {
            user = `<@${mentions.first().id}>`
        }
    txt = txt.replace('{user}', user)

    return txt
}

// reorganize content 
function reoganizeContent(content) {
    return content.replace(/  +/g, constants.stringSeparator).split(constants.stringSeparator)
}

/*************************************************** Cron Jobs ***************************************************/
/*
Cron Ranges
When specifying your cron values you'll need to make sure that your values fall within the ranges. 
For instance, some cron's use a 0-7 range for the day of week where both 0 and 7 represent Sunday. We do not.

Seconds: 0-59
Minutes: 0-59
Hours: 0-23
Day of Month: 1-31
Months: 0-11 (Jan-Dec)
Day of Week: 0-6 (Sun-Sat)

constructor(
    cronTime, -- required
    onTick,  -- required
    onComplete, -- optional
    start, --optional
    timezone, --optional
    context, --optional
    runOnInit,  --optional
    unrefTimeout) -- optional
*/


const stJob = new CronJob('* * * * * *', () => {
    let msg = getStMessage()
    if (msg !== undefined) {
        storyTellerSender(msg)
    }
})

const startSTJob = new CronJob(`00 ${constants.minuteStart} ${constants.hourStart} * * 1-5`, () => {
    let message = `Iniciado em  ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}\n`
    message += `Corretora: **${general.getServerData().broker}**\n`
    message += `Servidor: **${general.getServerData().server}**\n`
    message += 'Lembrando que podem haver divergencias de valores entre corretoras, inclusive entre contas na mesma corretora!'

    storyTellerSender(message)

    stJob.start()
})
const stopSTJob = new CronJob(`00 ${constants.minuteStop} ${constants.hourStop} * * 1-5`, () => {
    if (!general.getPosition().isPositioned) {
        if (stJob.running) {
            storyTellerSender('Finalizado em ' + new Date().toLocaleDateString() + ' - ' + new Date().toLocaleTimeString())
            stJob.stop()
        }
    }
})
const forceStopSTJob = new CronJob(`00 ${constants.minuteStopWithPosition} ${constants.hourStopWithPosition} * * 1-5`, () => {
    if (stJob.running) {
        storyTellerSender('Finalizado em ' + new Date().toLocaleDateString() + ' - ' + new Date().toLocaleTimeString())
        stJob.stop()
    }
})

//Start crons only if is enabled
if (constants.isStoryTellerEnabled) {
    startSTJob.start()
    stopSTJob.start()
    forceStopSTJob.start()
}

/*************************************************** StoryTeller Control ***************************************************/
//control of last indexes sended
let lastIndexes = [-1, -1]

//encapsulated send message
function storyTellerSender(txt) {
    if (constants.canStoryTellerSend) {
        let msg = `**:microphone2: XMBot Narrador Oficial! :microphone2:** \n${txt}`
            //console.log(txt)
        client.channels.get(constants.storyTellerChannel.toString()).send(msg)
    }
}

//get storyTeller message
function getStMessage() {
    try {
        let position = general.getPosition()
        let placed = general.getPlaced()
        let message = undefined

        if (position.isPositioned) {

            //control of positions
            let points

            if (position.type == 'VENDA') {
                points = Number(position.price) - Number(general.getBasicData().sellPrice)
            } else {
                points = Number(general.getBasicData().buyPrice) - Number(position.price)
            }

            if (position.isTerminated) {
                message = `Dia encerrado aqui galera!!! ${points} pontos no final do pregão!! Bora que amanhã tem mais!! :sunglasses:`

                position.isPositioned = false

                setTimeout(() => {
                    let msg = `<@${client.user.id}> imagem ${(points > 0) ? 'gain' : 'loss'}`
                    client.channels.get(constants.storyTellerChannel.toString()).send(msg)
                }, constants.millisToSendSTMessage)

                let msg = `${new Date().toLocaleDateString()} - fiz ${points} pontos com o XM na corretora ${general.getServerData().broker}!!** `

                //trocar
                client.channels.get(constants.storyTellerChannel.toString()).send(msg)

                stJob.stop()

            } else if (!position.messageSended) {
                message = `Pegou aqui!!! **${position.type}** em **${position.price}!!** Solta o fodete!!!`
                position.messageSended = true

                setTimeout(() => {
                    msg = `<@${client.user.id}> imagem ${(position.type == "VENDA") ? 'down' : 'up'}`
                    client.channels.get(constants.storyTellerChannel.toString()).send(msg)
                }, constants.millisToSendSTMessage)

            } else if (position.refresh) {
                message = `E vamos assim, **${points} pontos!!** **TP** em **${position.takeProfit}** e **SL** em **${position.stopLoss}**`
                position.refresh = false
                position.messageSended = true

            }

            general.setPosition(position)

            //controle of placed order
        } else if (placed.isPlaced) {

            if (placed.isCanceled) {
                message = `Poxa, cancelou a ordem... esse mercado não ta ajudando hein :frowning2:`

                placed.isCanceled = false
                placed.isPlaced = false
            } else if (!placed.messageSended) {

                message = `Aqui pendurou galera!!! Pegou no **${placed.price}**, **${placed.type}** em **${placed.target}**`

                placed.messageSended = true
            }

            general.setPlaced(placed)

            //default message control
        } else {
            let target = general.getCalculated().target
            let distance = general.getCalculated().distance

            if (distance >= 0 && typeof distance === 'number') {
                let index = Math.ceil(distance / 50)

                //send message only if index has changed
                if (lastIndexes.indexOf(index) == -1 && !isNaN(index)) {

                    message = stMessages[index]

                    message = message.toString().replace('<target>', target)
                    message = message.toString().replace('<distance>', distance)

                    if (lastIndexes.length > 2) {
                        lastIndexes.shift()
                    }

                    lastIndexes.push(index)

                }
            }
        }

        return message
    } catch (e) {
        logger.info('Error on getStMessage\n' + e)
        return undefined
    }
}