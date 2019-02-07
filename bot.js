const { Client, Attachment } = require('discord.js');

let logger = require('winston')
let auth = require('./auth.json')
let basics = require("./basics.json")
let constants = require("./constants.json")

// Configura logger
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});
logger.level = 'debug'


// Inicialização do bot
let client = new Client()
client.login(auth.token)

//Validação da inicialização do bot
client.on('ready', (event) => {
    logger.info(`${client.user.tag} Conectado!!`)
})


//listener das mensagens no server
client.on('message', (msg) => {

    //verifica se tem alguma menção
    if (msg.mentions.members.first() !== undefined) {
        //monta uma collection de menções, tirando o bot (pra não precisar controlar os index)
        let mentions = msg.mentions.users.filter(f => f.id !== client.user.id)

        //se for diferente o tamanho, é porque tinha menção ao bot
        if (mentions.size !== msg.mentions.users.size) {

            //monta a mensagem com apenas um espaço entre as palavras, caso tenha mais de uma
            message = msg.content.replace(/  +/g, constants.stringSeparator)

            //monta um array separando pelo delimitador padrão
            let args = message.split(constants.stringSeparator)

            //pega o texto em basics, de acordo com o argumento enviado na mensagem
            let txt = basics[args[1]]

            if (txt !== undefined) {
                txt = constants.initialText + txt + constants.finalText

                //percorre o json de constantes, fazendo as alterações, caso tenha
                constants.replaceConsts.forEach((c) => {
                    txt = txt.replace(c, constants[c])
                })

                //inclui menção ao usuário, caso tenha sido enviado o argumento
                let user = ''
                if (mentions.size == 1) {
                    user = `<@${mentions.first().id}>`
                }
                txt = txt.replace('{user}', user)

                msg.channel.send(txt)

            } else if (args[1] === 'imagem') {

                msg.channel.send(new Attachment(`./imagens/${args[2]}.png`));
            }

            //deleta a mensagem que disparou a execução do bot
            msg.delete()
        }

    }

})