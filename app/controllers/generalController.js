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
        let placed = general.getPlaced()

        placed.isPlaced = (req.body.isPlaced == 'true')
        placed.type = req.body.type
        placed.time = req.body.time
        placed.price = Number(req.body.price)
        placed.target = Number(req.body.target)
        placed.messageSended = (req.body.messageSended == 'true')
        placed.isCanceled = (req.body.isCanceled == 'true')

        general.setPlaced(placed)
        res.send('ok')
    }

    function positioned(req, res) {
        let positined = general.getPosition()

        positined.isPositioned = (req.body.isPositioned == 'true')
        positined.type = req.body.type
        positined.price = Number(req.body.price)
        positined.time = req.body.time
        positined.stopLoss = Number(req.body.stopLoss)
        positined.takeProfit = Number(req.body.takeProfit)
        positined.messageSended = (req.body.messageSended == 'true')
        positined.refresh = (req.body.refresh == 'true')
        positined.isTerminated = (req.body.isTerminated == 'true')

        general.setPosition(positioned)
        res.send('ok')
    }
}