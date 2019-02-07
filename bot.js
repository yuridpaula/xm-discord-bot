const { Client, Attachment } = require('discord.js');

let logger = require('winston')
let auth = require('./auth.json')
let basics = require("./basics.json")
let constants = require("./constants.json")

// logger configuration
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});
logger.level = 'debug'


// initialize bot
let client = new Client()
client.login(auth.token)

//initialization validation
client.on('ready', (event) => {
    logger.info(`${client.user.tag} Conectado!!`)
})


//listener of messages server
client.on('message', (msg) => {

    //verify mentions
    if (msg.mentions.members.first() !== undefined) {
        //mentions collections without bot mention
        let mentions = msg.mentions.users.filter(f => f.id !== client.user.id)

        //compare both for identify bot mentions
        if (mentions.size !== msg.mentions.users.size) {

            // reorganize content 
            message = msg.content.replace(/  +/g, constants.stringSeparator)

            let args = message.split(constants.stringSeparator)

            //verify basic text
            let txt = basics[args[1]]

            if (txt !== undefined) {
                txt = constants.initialText + txt + constants.finalText

                //update of constants
                constants.replaceConsts.forEach((c) => {
                    txt = txt.replace(c, constants[c])
                })

                //user mention
                let user = ''
                if (mentions.size == 1) {
                    user = `<@${mentions.first().id}>`
                }
                txt = txt.replace('{user}', user)

                msg.channel.send(txt)

            } else if (args[1] === 'imagem') {

                msg.channel.send(new Attachment(`./imagens/${args[2]}.png`));
            }

            //delete message that triggered the bot
            msg.delete()
        }

    }

})