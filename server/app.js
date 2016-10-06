var express     = require('express'),
    bodyParser  = require('body-parser'),
    request     = require('request'),
    app         = express(),
    fs          = require('fs'),
    path        = require('path'),
    os          = require('os'),
    crypto      = require('crypto'),
    uuid        = require('node-uuid'),
    port        = process.env.PORT || 8080,
    config = require('./config.json'),
    mongojs = require('mongojs'),
    ObjectId = require('mongojs').ObjectID,
    db = mongojs('confirmWebMobile', ['confirmWebMobile']),
    twilio = require('twilio')(config.twilio.ACCOUNT_SID, config.twilio.ACCOUNT_TOKEN);

// --------------------------------------------------------
// Confirm.io configuration
// --------------------------------------------------------
var CONFIRM_API_URL = 'https://api.confirm.io/v1/';

function confirmUrlFromPath(path) {
    if (path.indexOf('/') === 0) {
        path = path.slice(1);
    }

    return CONFIRM_API_URL + path;
}

function confirmReqAuth() {
    return {
        user: config.confirm.API_KEY,
        pass: ''
    };
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    // intercept OPTIONS method
    if (req.method.toLowerCase() === 'options') {
        res.sendStatus(200);
    } else {
        req.requestId = uuid.v4();

        next();
    }
});

// --------------------------------------------------------
// Init routes
// --------------------------------------------------------
app.post('/auth', function(req, res) {
    request.post(confirmUrlFromPath('/auth'), {
        auth: confirmReqAuth()
    }, function(error, response, body) {
        res.status(response.statusCode).send({
            status: response.statusCode,
            apiKey: JSON.parse(body).token
        });
    });
});

app.get('/ids/:idGuid', function(req, res) {
    request.get(confirmUrlFromPath('/ids/' + req.params.idGuid), {
        auth: confirmReqAuth()
    }, function(error, response, body) {
        res.status(response.statusCode).send({
            data: JSON.parse(body)
        });
    })
});

app.post('/textMessage', function(req, res) {
    var firstName = req.body.firstName,
        lastName = req.body.lastName,
        fullName = firstName + ' ' + lastName,
        fullUrl = req.body.authUrl,
        phoneNumber = req.body.phoneNumber;

    var user = {
        firstName: firstName,
        lastName: lastName,
        phoneNumber: phoneNumber,
        confirmAuthResult: {
            idGuid: '',
            authResult: ''
        }
    };

    if (phoneNumber.length === 0) {
        return res.status(500).send({
            message: 'Please provide a valid phone number'
        });
    }

    db.confirmWebMobile.insert(user, function(err, response) {
        var id = response._id;
        twilio.sendMessage({
            to: phoneNumber,
            from: config.twilio.FROM_NUMBER,
            body: 'Hello ' + fullName + '. Click below to authenticate your ID:\n' + fullUrl + "?userId=" + response._id
        }, function(error, response) {
            if (error) {
                return res.status(500).send({
                    message: 'Error in Twilio Server'
                });
            }
            res.status(response.nodeClientResponse.statusCode).send({
                id: id
            });
        });
    });
});

app.put('/users/:id', function(req, res) {
    db.confirmWebMobile.update(
        {_id: ObjectId(req.params.id)},
        {
            $set: {
                confirmAuthResult: {
                    idGuid: req.body.idGuid,
                    authResult: req.body.authResult
                }
            }
        });
});

app.get('/users/:id', function(req, res) {
    db.confirmWebMobile.find({_id: ObjectId(req.params.id)}, function(error, response) {
        if (error) {
            return res.status(500).send({
                message: 'Can\'t find document'
            });
        }

        res.status(200).send({
            data: response[0]
        })
    });
});


// --------------------------------------------------------
// Start server
// --------------------------------------------------------
app.listen(port, function() {
    console.log('Listening on port ' + port);
});
