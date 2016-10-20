var fs = require('fs'),
    readline = require('readline'),
    google = require('googleapis'),
    googleAuth = require('google-auth-library'),
    config = require('./config.json');

//leverage google api to manage who can access demo
var SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'sheets.googleapis.com-nodejs-quickstart.json';

function authorize(credentials, callback) {
    var clientSecret = credentials.client_secret;
    var clientId = credentials.client_id;
    var redirectUrl = credentials.redirect_uris[0];
    var auth = new googleAuth();
    var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

    fs.readFile(TOKEN_PATH, function(err, token) {
        if (err) {
            getNewToken(oauth2Client, callback);
        } else {
            oauth2Client.credentials = JSON.parse(token);
            callback(oauth2Client);
        }
    });
}

function getNewToken(oauth2Client, callback) {
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function(code) {
        rl.close();
        oauth2Client.getToken(code, function(err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
            callback(oauth2Client);
        });
    });
}

function storeToken(token) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token));
}

function listPhoneNumber(auth, callback) {
    var sheets = google.sheets('v4');
    sheets.spreadsheets.values.get({
        auth: auth,
        spreadsheetId: config.googleSheet.spreadSheet.spreadsheetId,
        range: config.googleSheet.spreadSheet.range
    }, function(error, response) {
        if (error) {
            return callback(error);
        }
        var rows = response.values;
        var phoneList = [];
        if (rows.length > 0) {
            for (var i = 0; i < rows.length; i++) {
                phoneList.push(rows[i][0]);
            }
        }
        callback(null, phoneList);
    });
}

module.exports = {
    getPhoneNumbers : function(callback) {
        var googleCredentials = config.googleSheet.installed;
        authorize(googleCredentials, function(auth) {
            listPhoneNumber(auth, function(error, phoneList) {
                callback(error, phoneList);
            })
        });
    }
};
