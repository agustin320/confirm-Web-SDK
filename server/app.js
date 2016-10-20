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
    googleSheet = require('./googleSheet.js'),
    db = mongojs('confirmWebMobile', ['confirmWebMobile']),
    twilio = require('twilio')(config.twilio.ACCOUNT_SID, config.twilio.ACCOUNT_TOKEN);



// --------------------------------------------------------
// Confirm.io configuration
// --------------------------------------------------------
var CONFIRM_API_URL = 'https://api.confirm.io/v1/';

db.on('error', function() {
    throw process.exit(1);
});

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

function sendText(number, name, url, callback) {
    twilio.sendMessage({
        to: number,
        from: config.twilio.FROM_NUMBER,
        body: 'Hello ' + name + '. Click below to authenticate your ID:\n' + url
    }, function(error, response) {
        if (error) {
            return callback(error);
        }

        callback(null, response);
    });
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
            message: 'Please provide a valid phone number',
            notificationStatus: 'warning'
        });
    }

    if (config.enableContactCheck && config.enableSaveProfileToDB) {
        googleSheet.getPhoneNumbers(function(error, phoneList) {
            if (error) {
                return res.status(500).send({
                    message: 'Google Sheet Error',
                    notificationStatus: 'danger'
                });
            }
            var number = '';

            for (var i = 0; i < phoneList.length; i++) {
                if (phoneList[i].indexOf('+1') === -1) {
                    number = "+1" + phoneList[i]
                } else {
                    number = phoneList[i]
                }
                if (phoneNumber === number) {
                    db.confirmWebMobile.insert(user, function(err, response) {
                        var id = response._id;
                        sendText(phoneNumber, fullName, fullUrl + "?userId=" + id, function(error, response) {
                            return res.status(response.nodeClientResponse.statusCode).send({
                                id: id
                            });
                        });
                    });
                    return;
                }
            }
            return res.status(500).send({
                message: 'Your do not have the permission to access to this demo. Please contact our sales team to try our demo',
                notificationStatus: 'warning'
            });
        });
    } else if (config.enableContactCheck) {
        googleSheet.getPhoneNumbers(function(error, phoneList) {
            if (error) {
                return res.status(500).send({
                    message: 'Google Sheet Error',
                    notificationStatus: 'danger'
                });
            }
            var number = '';
            for (var i = 0; i < phoneList.length; i++) {
                if (phoneList[i].indexOf('+1') === -1) {
                    number = "+1" + phoneList[i]
                } else {
                    number = phoneList[i]
                }
                if (phoneNumber === number) {
                    sendText(phoneNumber, fullName, fullUrl + "?mobile=true", function(error, response) {
                        return res.status(response.nodeClientResponse.statusCode).send({
                            message: 'Successfully sent message to ' + phoneNumber
                        });
                    });
                    return;
                }
            }
            return res.status(500).send({
                message: 'Your do not have the permission to access to this demo. Please contact our sales team.',
                notificationStatus: 'warning'
            });
        });
    } else if (config.enableSaveProfileToDB) {
        db.confirmWebMobile.insert(user, function(err, response) {
            console.log(err);
            var id = response._id;
            sendText(phoneNumber, fullName, fullUrl + "?userId=" + id, function(error, response) {
                return res.status(response.nodeClientResponse.statusCode).send({
                    id: id
                });
            });
        });
    } else {
        sendText(phoneNumber, fullName, fullUrl + "?mobile=true", function(error, response) {
            return res.status(response.nodeClientResponse.statusCode).send({
                message: 'Successfully sent message to ' + phoneNumber
            });
        });
    }
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
                message: 'Can\'t find document',
                notificationStatus: 'warning'
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
