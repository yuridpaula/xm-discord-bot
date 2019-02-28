let express = require('express')
let load = require('express-load')
let bodyparser = require('body-parser')
let cors = require('cors')

module.exports = function() {
    let app = express()
    app.set('port', 433)
    app.use(bodyparser.urlencoded({ extended: true }))
    app.use(bodyparser.json())
        //app.use(require('method-override')())
    app.use(cors())

    load('models', { cwd: 'app' }).then('controllers').then('routes').into(app)
    return app
}