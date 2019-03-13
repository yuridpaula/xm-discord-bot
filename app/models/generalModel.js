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

let placed = {
    isPlaced: false,
    type: '',
    time: '',
    price: '',
    target: '',
    messageSended: false,
    isCanceled: false
}

let position = {
    isPositioned: false,
    type: '',
    price: '',
    time: '',
    stopLoss: '',
    takeProfit: '',
    messageSended: false,
    refresh: false,
    isTerminated: false
}


module.exports = {
    getBasicData: () => basicData,
    setBasicData: (d) => basicData = d,

    getImaData: () => imaData,
    setImaData: (d) => imaData = d,

    getServerData: () => serverData,
    setServerData: (d) => serverData = d,

    getCalculated: () => calculated,
    setCalculated: (d) => calculated = d,

    getPlaced: () => placed,
    setPlaced: (d) => placed = d,

    getPosition: () => position,
    setPosition: (d) => position = d,


}