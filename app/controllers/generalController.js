let general = require('../models/generalModel')

module.exports = function(app) {

    return {
        basic,
        ima,
        server,
        placed,
        positioned
    }

    function basic(req, res) {
        general.setBasicData(req.body)

        let calculated = general.getCalculated()

        calculated.buyLine = Math.round(general.getImaData().buyLine)
        calculated.sellLine = Math.round(general.getImaData().sellLine)

        calculated.diffBuy = general.getBasicData().buyPrice - calculated.buyLine
        calculated.diffSell = calculated.sellLine - general.getBasicData().sellPrice

        calculated.target = (calculated.diffBuy <= calculated.diffSell) ? "COMPRA" : "VENDA"
        calculated.distance = (calculated.diffBuy <= calculated.diffSell) ? calculated.diffBuy : calculated.diffSell

        general.setCalculated(calculated)

        res.send('ok')
    }

    function ima(req, res) {
        general.setImaData(req.body)

        res.send('ok')
    }

    function server(req, res) {
        general.setServerData(req.body)
        res.send('ok')
    }

    function placed(req, res) {
        general.setPlaced(req.body)
        res.send('ok')
    }

    function positioned(req, res) {
        general.setPosition(req.body)
        res.send('ok')
    }
}