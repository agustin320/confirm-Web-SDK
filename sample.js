// ----------------------------------------------------- //
// Configuration
// ----------------------------------------------------- //
var isTwilioEnabled = true,
    isSessionPersistenceEnabled = true,
    API_URL = 'http://{YOUR_SERVER_ADDRESS}/';


$(document).ready(function() {
    var isOnMobileBrowser = function() {
        return window.navigator.userAgent.match(/(iPad)|(iPhone)|(iPod)|(android)|(webOS)/i);
    };

    var sendNotification = function(type, message) {
        $.notify({
            message: message
        }, {
            type: type,
            allow_dismiss: true,
            delay: 1000,
            animate: {
                enter: 'animated fadeInDown',
                exit: 'animated fadeOutUp'
            }
        });
    };

    var initResultRender = function() {
        $('#confirm-sample-auth-result').addClass('hide');
        $('#confirm-auth-result-first-name').html('');
        $('#confirm-auth-result-last-name').html('');
        $('#confirm-auth-result-dob').html('');
        $('#confirm-auth-result-address').html('');
        $('#confirm-auth-result-city').html('');
        $('#confirm-auth-result-state').html('');
        $('#confirm-auth-result-zip').html('');
        $('#confirm-auth-result-gender').html('');
        $('#confirm-auth-result-classification-type').html('');
        $('#confirm-auth-result-classification-state').html('');
        $('#confirm-auth-result-exp-date').html('');
        $('#confirm-auth-result-issued-date').html('');
        $('#confirm-auth-result-doc-number').html('');
    };

    var renderBioResult = function(data) {
        if (data) {
            initResultRender();
            $('#confirm-sample-auth-result').removeClass('hide').addClass('animated bounceInUp');
            $('#confirm-auth-result-first-name').append(data.identity.bio.firstName);
            $('#confirm-auth-result-last-name').append(data.identity.bio.lastName);
            $('#confirm-auth-result-dob').append(data.identity.bio.dob);
            $('#confirm-auth-result-address').append(data.identity.bio.address);
            $('#confirm-auth-result-city').append(data.identity.bio.city);
            $('#confirm-auth-result-state').append(data.identity.bio.state);
            $('#confirm-auth-result-zip').append(data.identity.bio.zip);
            $('#confirm-auth-result-gender').append(data.identity.bio.gender);
            $('#confirm-auth-result-classification-type').append(data.identity.classification.type);
            $('#confirm-auth-result-classification-state').append(data.identity.classification.state);
            $('#confirm-auth-result-exp-date').append(data.identity.issuance.expiration);
            $('#confirm-auth-result-issued-date').append(data.identity.issuance.issued);
            $('#confirm-auth-result-doc-number').append(data.identity.issuance.number);
        }
    };

    var cleanFailureReasons = function() {
        $('#confirm-sample-auth-fail-results').addClass('hide');
        $('#confirm-auth-fail-results-display').html('');
    };

    var renderFailureReasons = function(failureReasons) {
        if (failureReasons) {
            $('#confirm-sample-auth-fail-results').removeClass('hide');
            $.each(failureReasons, function(index, reason) {
                $('#confirm-auth-fail-results-display').append(reason);
            });
        }
    };

    var getParameterByName = function(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    };

    var getAuthResultFromDB = function(recordId) {
        $.ajax({
            type: 'GET',
            url: API_URL + 'users/' + recordId,
            dataType: 'json',
            success: function(data) {
                if (data.data.confirmAuthResult.authResult !== 'pass' && data.data.confirmAuthResult.authResult !== 'fail') {
                    setTimeout(function(){
                        getAuthResultFromDB(recordId);
                    }, 1000);
                } else {
                    $('#loading-card').addClass('hide');
                    if (data.data.confirmAuthResult.authResult === 'pass') {
                        $('#result-card').removeClass('hide').addClass('animated bounceInRight');
                        $('#result-pass').removeClass('hide');
                    } else if (data.data.confirmAuthResult.authResult === 'fail') {
                        $('#result-card').removeClass('hide').addClass('animated bounceInRight');
                        $('#result-fail').removeClass('hide');
                    }
                }
            }
        });
    };

    var renderDesktopDemo = function() {
        var userId = '';
        $('#confirm-sample-twilio-form').removeClass('hide');
        $('#phone').intlTelInput();
        $('#twilio-form').submit(function(event) {
            event.preventDefault();
            $.ajax({
                type: 'POST',
                url: API_URL + 'textMessage',
                dataType: 'json',
                data: {
                    phoneNumber: $("#phone").intlTelInput("getNumber"),
                    firstName: $('#first-name').val(),
                    lastName: $('#last-name').val(),
                    authUrl: window.location.href
                }
            }).done(function(response) {
                userId = response.id;
                $('#twilio-card').addClass('hide');
                $('#loading-card').removeClass('hide').addClass('animated bounceInRight');
                getAuthResultFromDB(userId);
            }).fail(function() {
                sendNotification('danger', 'Fail to send link for ID auth');
            });
        });

        $('.reload-link').click(function() {
            location.reload();
        });
    };

    var renderMobileDemo = function() {
        $('#confirm-sample-mobile-wrapper').removeClass('hide');
        $('#confirm-sample-auth-form').removeClass('hide');
        getParameterByName('userId');
        //Inject confirm auth form by given a div id.
        var confirmSDK = ConfirmSDK.init('confirm-sample-auth-form');

        //Get the Confirm API key
        var getAPIKey = function(callback) {
            $.ajax({
                type: 'POST',
                url: API_URL + 'auth'
            }).done(function(response) {
                callback(null, response.apiKey);
            }).fail(function(response) {
                callback(response);
            });
        };

        //Set the API key and you have confirm auth form on your app.
        getAPIKey(function(error, api) {
            confirmSDK.setApiKey(api);

            //custom callback to display bio
            confirmSDK.onSubmit(function(error, idGuid) {
                $.ajax({
                    type: 'GET',
                    url: API_URL + 'ids/' + idGuid
                }).done(function(response) {
                    var data = response.data;
                    var idGuid = data.guid;
                    var status = data.status;
                    var userId = getParameterByName('userId');
                    $.ajax({
                        type: 'PUT',
                        url: API_URL + 'users/' + userId,
                        dataType: 'json',
                        data: {
                            idGuid: idGuid,
                            authResult: status
                        }
                    });
                    renderBioResult(data);
                    cleanFailureReasons();
                    if (data.failureReasons && data.failureReasons.length > 0) {
                        var failureReasons = data.failureReasons;
                        renderFailureReasons(failureReasons);
                    }
                });
            });

            confirmSDK.onRetry(function() {
                $('#confirm-sample-auth-result').addClass('hide');
            });
        });
    };

    // Check if users is using desktop or mobile
    if (isTwilioEnabled && !isOnMobileBrowser()) {
        renderDesktopDemo();
    } else {
        if (isSessionPersistenceEnabled) {
            if (window.location.href.indexOf('userId') === -1) {
                renderDesktopDemo();
            } else {
                renderMobileDemo();
            }
        } else {
            renderMobileDemo();
        }
    }
});
