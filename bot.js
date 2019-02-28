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

//for not cache de print image
const moment = require('moment')

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
                const url = `https://ashita.com.br/xmprint?t=${moment().format()}`

                msg.channel.send(url)
            }

            //delete message that triggered the bot
            msg.delete()
        }
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

        args.forEach((a) => {
            onlyNumbers = onlyNumbers || (a.match(/\d+/g) !== null)
            hasCorretora = hasCorretora || a.toString().toLowerCase() === 'corretora'
            hasCloud = hasCloud || a.toString().toLowerCase() === 'cloud'
            hasPontos = hasPontos || a.toString().toLowerCase() === 'pontos'
        })

        if (!(onlyNumbers && //Some word with only number
                hasCorretora && // The word 'corretora' in the message
                hasCloud && // The word 'cloud' in the message
                hasPontos) // The word 'pontos' in the message
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

/*************************************************** Time Controllers ***************************************************/
let now = new Date()

//calc the diff between now and hourStart, in ms
let millisTo9 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), constants.hourStart, 0, 0, 0) - now
if (millisTo9 < 0) {
    millisTo9 += 86400000
}
//calc the diff between now and hourStop, in ms
let millisTo13 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), constants.hourStop, 0, 0, 0) - now
if (millisTo13 < 0) {
    millisTo13 += 86400000
}

/*************************************************** StoryTeller Control ***************************************************/
//start storyTeller
setTimeout(() => {
    startStoryTeller()
}, millisTo9)

const hourNow = new Date().getHours()

//start story teller if it's between time execution
if (hourNow > constants.hourStart && hourNow < constants.hourStop) {
    //if (hourNow > constants.hourStart && hourNow < 14) {
    //wait server initiate, to start storyTeller
    console.log('Iniciado por estar dentro do intervalo de horas (não foi agendado!)')
    setTimeout(() => {
        startStoryTeller()
    }, constants.millisToDeleteBotMessage)
}

//stop storyTeller
setTimeout(() => {
    stopStoryteller()
}, millisTo13)

//controller of execution
let storyTeller

//control of execution timer
function startStoryTeller() {

    let message = `Iniciado em  ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}\n`
    message += `Corretora: **${general.getServerData().broker}**\n`
    message += `Servidor: **${general.getServerData().server}**\n`
    message += 'Lembrando que podem haver divergencias de valores entre corretoras, inclusive entre contas na mesma corretora!'

    storyTellerSender(message)

    storyTeller = setInterval(() => {
        let msg = getStMessage()
        if (msg !== undefined) {
            storyTellerSender(msg)
        }
    }, constants.millisToDeleteBotMessage)
}

//clear the execution of interval
function stopStoryteller() {
    storyTellerSender('Finalizado em ' + new Date().toLocaleDateString() + ' - ' + new Date().toLocaleTimeString())
    clearInterval(storyTeller)
}

//control of las index sended
let lastIndex = -1

//encapsulated send message
function storyTellerSender(txt) {
    if (constants.canStoryTellerSend) {
        let msg = `**:microphone2: XMBot Narrador Oficial! :microphone2:** \n${txt}`
            //console.log(txt)
        client.channels.get(constants.testBotChannel.toString()).send(msg)
            /*.then((message) => {
                setTimeout(() => {
                    message.delete()
                }, constants.millisToDeleteBotMessage)
            })*/
    }
}


//get storyTeller message from file based on the diference 
function getStMessage() {
    let message

    let target = general.getCalculated().target
    let distance = general.getCalculated().distance

    if (distance >= 0) {
        let index = Math.ceil(distance / 50)

        //send message only if index has changed
        if (index !== lastIndex) {

            let message = stMessages[index]

            message = message.toString().replace('<target>', target)
            message = message.toString().replace('<distance>', distance)

            lastIndex = index

            return message
        }
    }
}