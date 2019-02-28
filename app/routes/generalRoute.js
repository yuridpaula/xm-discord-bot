module.exports = function(app) {
    app.post('/basic', function(req, res) {
        app.controllers.generalController.basic(req, res)
    })

    app.post('/ima', function(req, res) {
        app.controllers.generalController.ima(req, res)
    })

    app.post('/server', function(req, res) {
        app.controllers.generalController.server(req, res)
    })

}