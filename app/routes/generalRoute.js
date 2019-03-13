module.exports = function(app) {
    app.post('/basic', function(req, res) {
            app.controllers.generalController.basic(req, res)
        })
        .post('/ima', function(req, res) {
            app.controllers.generalController.ima(req, res)
        })
        .post('/server', function(req, res) {
            app.controllers.generalController.server(req, res)
        })
        .post('/placed', function(req, res) {
            app.controllers.generalController.placed(req, res)
        })
        .post('/positioned', function(req, res) {
            app.controllers.generalController.positioned(req, res)
        })

}