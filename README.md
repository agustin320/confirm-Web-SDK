# ![Confirm logo](https://s3-us-west-2.amazonaws.com/confirm.public/web-images/confirm-logo_43x34.png) Confirm.io Web SDK

[Confirm.io](http://www.confirm.io/) provides simple, safe, and secure mobile ID authentication solutions. Our cloud API
and paired image capture SDK empower applications to more seamlessly collect customer information and authenticate the
identity of their users.

This SDK requires an API key issued by Confirm.io in order to submit documents to our cloud. If you wish to test out the
SDK, [please contact Confirm](http://www.confirm.io/#!contact/i66dd) to receive your demo API key.

## What's included
* SDK bundle
  * The distribution bundle to be included in your web application.
* Sample API server
  * A node.js/express server serving a sample API. This API represents best practices for authenticating with Confirm's
    servers, as well as a means of providing desktop to mobile experiences using [Twilio](https://www.twilio.com/).
* Sample web application
  * Example web application that shows how to use the Confirm Web SDK. This sample leverages the distribution SDK as well
    as the sample server for authentication and querying.


## Sample App - Getting Started
_The sample application requires Node.js to run. To learn how to install node.js, [click here](https://nodejs.org/en/download/)._

### Running the sample server
1. Navigate to the sample server folder, located at `./server/`
2. Install npm modules: `npm install`
3. Add your API key to the `config.json` (optionally specify a twilio account ID and token if you plan on testing
desktop to mobile).
4. Start the server: `node app.js`

### Open the sample web application
1. Install npm modules: `npm install`
2. Set the API_URL inside the `sample.js` to your server's address and operational port (defaults to 8080)
3. (Optional) Set the variable `isTwilioEnabled` to true in the `sample.js` file if you wish to enable desktop to mobile
   (this requires the proper Twilio keys in the server sample configuration).
4. (Optional) Set the variable `isSessionPersistenceEnabled` to true in the `sample.js` file if you are leveraging a database
   to retain a unique user ID. This will allow the desktop to know when the user has completed ID auth on their device.
5. Start the local web server: `grunt`
6. Navigate to your web server in your browser: `http://127.0.0.1:3001`


### Additional sample app features
1. Twilio integration
    * Allows users to provide a phone number to receive a text message to complete the ID authentication process on their 
      mobile device.
2. Desktop/Mobile Session Persistence
    * Stores phone numbers and names in a mongo database that represents the user session. When typing in a phone number 
      on the desktop, the experience will show a loading icon that will update after the user has completed the process 
      on their mobile device. 
    * _Note that this feature requires the running and operation of a mongo database._


## SDK - Documentation

### Initializing the plugin
```javascript
var confirm = ConfirmSDK.init('confirm-sample-auth-form');
```

The `ConfirmSDK.init()` function accepts the ID of the HTML element you wish to render the plugin into on your page. Calling
this method will return an instance of the plugin with which you can attach other handlers described below.

### Getting a consumer key, and setting it in the SDK
Confirm leverages a secret/consumer key authentication flow that allows requests to safely be made from a web browser
directly to Confirm's servers. Our sample API (included in this project) contains the details on creating a consumer key,
and our sample web application shows how this key can be set within the SDK. The example is from our sample web app
and shows how you'd request and set a consumer key:

```javascript
$.ajax({
    type: 'POST',
    url: 'http://localhost:8080/auth'
}).done(function(response) {
    confirm.setApiKey(response.apiKey);
});
```

### Registering a completion callback
The SDK can notify the application once authentication is complete allowing developers to move customers through the
desired flow. Attaching this callback is done with the `onSubmit()` method as shown below:

```javascript
confirm.onSubmit(function(error, idGuid) {
    // The idGuid is the unique identifier for the document submission. This identifier can be stored or shared with your
    // servers allowing them to pull authentication results and personal information for your records.
});
```

### Registering a retry callback
In the event that a submission yields a `fail` or `unknown` result from the Confirm API, users are prompted to retry 
their submission under different environmental conditions to attempt to complete the process. The retry callback is 
triggered whenever a user presses the retry button so that other page elements can be updated as a result.

```javascript
confirm.onRetry(function() {
    // Retry button was pressed
});
```

### Putting it all together
_Note: This sample assumes you're using the sample API bundled with this SDK to generate consumer keys. Please update
the consumer key generation request as needed._

```
<script type="text/javascript">
    // Initialize the SDK and place the plugin at the HTML element with the ID: `confirm-auth-plugin`
    var confirm = ConfirmSDK.init('confirm-auth-plugin');

    // Generate your consumer key
    $.ajax({
        type: 'POST',
        url: 'http://localhost:8080/auth'
    }).done(function(response) {
        confirm.setApiKey(response.apiKey);

        // Attach click handler
        confirm.onSubmit(function(error, idGuid) {
            // Get full response payload from the API sample
            // Note: Requests made with consumer keys don't return personal information so as to protect the privacy of users
            $.ajax({
                type: 'GET',
                dataType: 'json',
                url: 'http://localhost:8080/ids/' + idGuid
            }).done(function(response) {
                // response includes full document details from the submission
            });
        });

        // Attach retry handler
        confirm.onRetry(function() {
            // Retry button was pressed
        });
    });
</script>
```
