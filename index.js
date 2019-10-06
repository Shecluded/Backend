const functions = require('firebase-functions');
const admin = require('firebase-admin');
var crypto = require('crypto');
var rp = require("request-promise");
var request = require('request');
admin.initializeApp();
const Nexmo = require('nexmo');
const sgMail = require('@sendgrid/mail');
require('dotenv').config();


// Initialinng a admin on local server, **Would revert to this for only local testing**

// var serviceAccount = require("/Users/mac/Downloads/shecluded-firebase-adminsdk-c8lsf-7702979dd3.json");

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: "https://shecluded.firebaseio.com"
// });
//Admin local server ends here****

//Data base
var db = admin.firestore()

// Disable deprecated features
db.settings({
  timestampsInSnapshots: true
});

//Keys and secrets
const nexmo = new Nexmo({
  apiKey: process.env.NEXMO_APIKEY,
  apiSecret: process.env.NEXMO_APISECRET,
});



// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions

exports.helloWorld = functions.https.onRequest((request, response) => {
 response.send("Hello from Firebase!");
});

exports.SendPhoneAuth = functions.https.onCall((phonenumber) => {


    //Firebase funtions must only return a promise, So I converted this callback funtion to a promise.
    return new Promise(((resolve,reject) => {
        nexmo.verify.request({
            number: phonenumber,
            brand: 'Nexmo',
            code_length: '6',
            workflow_id: '4'
          }, (err, result) => {
            if(err){
                reject(err);
              }else{
                  resolve(result);
              }
            }
    );
          
    }));
        
    

});

exports.PhoneAuthVerify = functions.https.onCall((load) => {

    return new Promise(((resolve,reject) => {

        nexmo.verify.check({
            request_id: load.id,
            code: load.code
          }, (err, result) => {
            if(err){
                reject(err);
              }else{
                  resolve(result);
              }
          });

    }));
    


});

exports.SendWelcomeMail = functions.https.onCall( async(email,context) => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  //Actioncode is for the firebase email verification. It passes in varguements that change the behaviour of the link
  const actionCodeSettings = {
    // URL you want to redirect back to. The domain (www.example.com) for
    // this URL must be whitelisted in the Firebase Console.
    url: 'https://shecluded.web.app/',
    
  };

 
 return admin.auth().generateEmailVerificationLink(context.auth.token.email, actionCodeSettings)
  .then(async(link) => {
    const msg = {
      to: context.auth.token.email,
      from: 'test@example.com',
      subject: 'Sending with Twilio SendGrid is Fun',
      templateId: 'd-b626671df4f34d34b5316000ec89720c',
      dynamic_template_data: {
       subject: 'Testing Templates',
       firstname: context.auth.token.name,
      //  name: context.auth.token.name,
       link: link
      }
    };
    
    await sgMail.send(msg)
    return {success:true}
  })
  .catch((error) => {
    return{error}
  });
});