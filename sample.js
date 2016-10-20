// ----------------------------------------------------- //
// Configuration
//
// Be sure to replace the CONFIRM_SAMPLE_SERVER_ADDRESS
// with the IP or hostname of the machine running the
// server code embedded with this sample.
// ----------------------------------------------------- //
var isTwilioEnabled = true,
    isSessionPersistenceEnabled = true,
    API_URL = 'http://{CONFIRM_SAMPLE_SERVER_ADDRESS}:8080/';


$(document).ready(function() {
    var isOnMobileBrowser = function() {
        return window.navigator.userAgent.match(/(iPad)|(iPhone)|(iPod)|(android)|(webOS)/i);
    };

    var sendNotification = function(type, delay, message) {
        $.notify({
            message: message
        }, {
            type: type,
            allow_dismiss: true,
            delay: delay,
            animate: {
                enter: 'animated fadeInDown',
                exit: 'animated fadeOutUp'
            }
        });
    };

    var initResultRenderOnMobile = function() {
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

    var renderBioResultOnMobile = function(data) {
        if (data) {
            initResultRenderOnMobile();
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

    var initResultRenderOnDesktop = function() {
        $('#desktop-auth-result-panel').addClass('hide');
        $('#desktop-auth-result-first-name').val('');
        $('#desktop-auth-result-last-name').val('');
        $('#desktop-auth-result-first-dob').val('');
        $('#desktop-auth-result-address').val('');
        $('#desktop-auth-result-city').val('');
        $('#desktop-auth-result-state').val('');
        $('#desktop-auth-result-zip').val('');
        $('#desktop-auth-result-gender').val('');
    };

    var renderBioResultOnDesktop = function(data) {
        if (data) {
            initResultRenderOnDesktop();
            $('#desktop-auth-result-panel').removeClass('hide').addClass('animated bounceInRight');
            $('#desktop-auth-result-first-name').val(data.identity.bio.firstName).addClass('has-value');
            $('#desktop-auth-result-last-name').val(data.identity.bio.lastName).addClass('has-value');
            $('#desktop-auth-result-dob').val(data.identity.bio.dob).addClass('has-value');
            $('#desktop-auth-result-address').val(data.identity.bio.address).addClass('has-value');
            $('#desktop-auth-result-city').val(data.identity.bio.city).addClass('has-value');
            $('#desktop-auth-result-state').val(data.identity.bio.state).addClass('has-value');
            $('#desktop-auth-result-zip').val(data.identity.bio.zip).addClass('has-value');
            $('#desktop-auth-result-gender').val(data.identity.bio.gender).addClass('has-value');
        }
    };

    var cleanFailureReasonsOnMobile = function() {
        $('#confirm-sample-auth-fail-results').addClass('hide');
        $('#confirm-auth-fail-results-display').html('');
    };

    var renderFailureReasonsOnMobile = function(failureReasons) {
        if (failureReasons) {
            $('#confirm-sample-auth-fail-results').removeClass('hide');
            $.each(failureReasons, function(index, reason) {
                $('#confirm-auth-fail-results-display').append(reason);
            });
        }
    };

    var renderResultOnMobile = function(data) {
        renderBioResultOnMobile(data);
        cleanFailureReasonsOnMobile();
        if (data.failureReasons && data.failureReasons.length > 0) {
            var failureReasons = data.failureReasons;
            renderFailureReasonsOnMobile(failureReasons);
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
                        $.ajax({
                            type: 'GET',
                            url: API_URL + 'ids/' + data.data.confirmAuthResult.idGuid
                        }).done(function(response) {
                            var data = response.data;
                            renderBioResultOnDesktop(data);
                        });
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
                if (response.id !== undefined && response.id.length > 0) {
                    userId = response.id;
                    $('#twilio-card').addClass('hide');
                    $('#loading-card').removeClass('hide').addClass('animated bounceInRight');
                    getAuthResultFromDB(userId);
                } else if (response.message !== undefined && response.message.length > 0) {
                    sendNotification('success', 3000, response.message);
                }
            }).fail(function(error) {
                if (error.responseText) {
                    var errorMessage = JSON.parse(error.responseText);
                    if (errorMessage.message.length > 0) {
                        sendNotification(errorMessage.notificationStatus, 3000, errorMessage.message);
                    } else {
                        sendNotification('warning', 3000, 'Fail to send link for ID auth');
                    }
                } else {
                    sendNotification('danger', 3000, 'Server Connection Error');
                }
            });
        });

        $('.reload-link').click(function() {
            location.reload();
        });

        $('input').focusout(function() {
            var text = $(this).val();
            if (text === '') {
                $(this).removeClass('has-value');
            } else {
                $(this).addClass('has-value');
            }
        });

        $('#next-button').click(function(){
            $('#desktop-auth-result-panel').addClass('hide');
            $('#result-card').removeClass('hide').addClass('animated bounceInRight');
            $('#result-pass').removeClass('hide');
        })
    };

    var renderMobileDemo = function() {
        $('#confirm-sample-mobile-wrapper').removeClass('hide');
        $('#confirm-sample-auth-form').removeClass('hide');

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
                    if (isSessionPersistenceEnabled && getParameterByName('userId') !== null) {
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
                        renderResultOnMobile(data);
                    } else {
                        renderResultOnMobile(data);
                    }
                });
            });

            confirmSDK.onRetry(function() {
                $('#confirm-sample-auth-result').addClass('hide');
            });
        });
    };

    //Check if users is using desktop or mobile
    if (isTwilioEnabled && !isOnMobileBrowser()) {
        renderDesktopDemo();
    } else if (isOnMobileBrowser()) {
        if (getParameterByName('userId') !== null) {
            if (getParameterByName('userId').length > 0) {
                renderMobileDemo();
            }
        } else if (getParameterByName('mobile') !== null) {
            if (getParameterByName('mobile') === 'true') {
                renderMobileDemo();
            }
        } else {
            renderDesktopDemo();
        }
    } else {
        renderMobileDemo();
    }
});
