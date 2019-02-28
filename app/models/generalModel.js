let basicData = {
    time: '',
    symbol: '',
    buyPrice: '',
    sellPrice: ''
}

let imaData = {
    time: '',
    symbol: '',
    movingAverage: '',
    buyLine: '',
    sellLine: ''
}

let serverData = {
    broker: '',
    server: ''
}

let calculated = {
        buyLine: "",
        sellLine: "",
        diffBuy: "",
        diffSell: "",
        target: "",
        distance: ""
    }
    /*
    let isPlaced = false
    let isPositioned = false

    let placed = {
        tipe: '',
        time: '',
        price: '',
        target: ''
    }

    let position = {
        tipe: '',
        time: '',
        price: '',
        target: ''
    }
    */
module.exports = {
    getBasicData: () => basicData,
    setBasicData: (d) => basicData = d,

    getImaData: () => imaData,
    setImaData: (d) => imaData = d,

    getServerData: () => serverData,
    setServerData: (d) => serverData = d,

    getCalculated: () => calculated,
    setCalculated: (d) => calculated = d

    /*

    getPlaced: () => placed,
    setPlaced: (d) => placed = d,

    getPosition: () => position,
    setPosition: (d) => position = d,

    getIsPlaced: () => isPlaced,
    setIsPlaced: (bol) => isPlaced = bol,

    getIsPositioned: () => isPositioned,
    setIsPositioned: (bol) => isPositioned = bol
    */
}