const functions = require('firebase-functions');
const admin = require('firebase-admin');
var crypto = require('crypto');
var rp = require("request-promise");
var request = require('request');
admin.initializeApp();
const Nexmo = require('nexmo');
require('dotenv').config();

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

    }))
    


});
