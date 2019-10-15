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
    url: 'https://shecluded.firebaseapp.com/welcome',
    
  };

  const user = await admin.auth().getUser(context.auth.uid)

  user.displayName

 
 return admin.auth().generateEmailVerificationLink(context.auth.token.email, actionCodeSettings)
  .then(async(link) => {
    const msg = {
      to: context.auth.token.email,
      from: 'test@example.com',
      subject: 'Sending with Twilio SendGrid is Fun',
      templateId: 'd-b626671df4f34d34b5316000ec89720c',
      dynamic_template_data: {
       subject: 'Testing Templates',
       firstname: user.displayName,
      //  name: context.auth.token.name,
       link: link
      }
    };

    console.log(context.auth);
    
    await sgMail.send(msg)
    return {success:true}
  })
  .catch((error) => {
    return{error}
  });
});

exports.paystack_webhook = functions.https.onRequest((req, res) => {

  var hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET).update(JSON.stringify(req.body)).digest('hex');
  if (hash === req.headers['x-paystack-signature']) {
      // Retrieve the request's body
    var event = req.body;
    // Do something with event
    console.log(event)
    if(event.event === 'charge.success'){
      admin.firestore().collection("transactions").add(event)
    .then(()=>{
      res.send(200);
      return {success: true}
    })
    .catch((err)=>{
      return err
    }) 
    } else if (event.event === transfer.success){
      admin.firestore().collection("paystack_tranfers").add(event)
      .then(()=>{
        res.send(200);
        return {success: true}
      })
      .catch((err)=>{
        return err
      }) 


    }
  
    
  }
  
});

exports.Transaction_Listener = functions.firestore.document('transactions/{docId}').onCreate(async(change,context)=>{

  const email = change.data().data.customer.email;

  const user = await admin.auth().getUserByEmail(email);

  return change.ref.set({
    Uid: user.uid
  }, {merge: true});
  

});

exports.List_Banks = functions.https.onCall((random)=>{

  var options = { 
    headers: { Authorization:  "Bearer " +process.env.PAYSTACK_SECRET },
    method: 'GET',
    uri: 'https://api.paystack.co/bank',
    body: "",
    json: true // Automatically stringifies the body to JSON




  };
 
  

  return rp(options)
    .then(res =>{
      
      return res
    })
    .catch(err =>{
      console.log(err)
      return err.error
    })





});

exports.Paystack_Bvn_Verify = functions.https.onCall((data) => {

  var options = { 
    headers: { Authorization:  "Bearer " +process.env.PAYSTACK_SECRET },
    method: 'GET',
    uri: 'https://api.paystack.co/bank/resolve_bvn/'+data,
    body: "",
    json: true // Automatically stringifies the body to JSON




  };
 
  

  return rp(options)
    .then(res =>{
      
      return res
    })
    .catch(err =>{
      // console.log(err)
      return err.error
    })

  
});

exports.Paystack_Verify_Transaction = functions.https.onCall(async(refrence,context) => {

  var options = { 
    headers: { Authorization:  "Bearer " +process.env.PAYSTACK_SECRET },
    method: 'GET',
    uri: 'https://api.paystack.co/transaction/verify/'+refrence,
    body: "",
    json: true // Automatically stringifies the body to JSON




  };
  var rest = '';
  

  rest = await rp(options)

    console.log(rest)
      return db.collection('users').where("userID", "==" ,context.auth.uid).get()
      
      
      // .doc("EcdBcunse9Upgho2Tl9NVQkLbu03").collection("Finance").add(res.result.authorization)
      // console.log(user)
      // return user.doc("paystack_auth").set(res.result.authorization);
    
    .then((user)=>{
      
      user.forEach(async(doc) => {
        
       doc.ref.collection("finance").doc("paystack_auth").set(rest.data.authorization)
       
        
      });
      
      return {success: true}
      
      
    })
    .catch((err) =>{
      // console.log(err)
      return err.error
    })

  
});

exports.Create_Recipient = functions.https.onCall(async(user, context) => {

  var options = { 
    headers: { Authorization:  "Bearer " +process.env.PAYSTACK_SECRET },
    method: 'POST',
    uri: 'https://api.paystack.co/transferrecipient',
    body:{
      type: "nuban",
      name: '',
      account_number: "",
      bank_code: ""
    },
    json: true // Automatically stringifies the body to JSON




  };
  var docID
  const userDoc = await db.collection("users").where("userID", "==","W8MF2nhe23Qc4FKAmH6QGOrwOCi1").get()

  userDoc.forEach(async(doc) =>{
    console.log("we got here")

   docID = doc.id
  
   options.body.name = doc.data().firstName
  })

  const bank = await db.collection("users").doc(docID).collection("finance").doc("bank_details").get()

  console.log(bank.data())
   options.body.account_number =    bank.data().accountNumber
    options.body.bank_code = bank.data().bankCode
    console.log(bank)
   console.log(options.body)

  return rp(options)
  .then((res)=>{
    return res
  })
  .catch((err)=>{
    return err.error
  })
  


})

exports.Calculate_Loan = functions.https.onCall((loan) => {
  let p = loan.loanAmount;
  // const r = 0.03;
  const n = loan.loanDuration;

  if(loan.loanTerm === "monthly"){
    var r = 0.03
  } else if (loan.loanTerm === "weekly"){
    // eslint-disable-next-line no-redeclare
    var r = 0.08
  }

 



  let amort = p/((((1+r)**n)-1)/((r*(1+r)**n)));
  var 
  TotalCapital = 0,
  TotalInterest = 0 ,
  TotalRepayment = 0 

  
  let capitalPayment = 0;
  var i;
  let paymentSchedule = []
  for(i = 0; i <n; i++){
    
    let interest = p*r;
    capitalPayment = amort - interest;

    let payment = {
      capital: Math.round(capitalPayment * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      repayment:Math.round(amort * 100) / 100,
    }
    TotalCapital += payment.capital
    TotalInterest += payment.interest
    TotalRepayment += payment.repayment
    
  
    
    paymentSchedule.push(payment)

    p -= capitalPayment
  }

  let result = {
    TotalCapital: Math.round(TotalCapital * 100) / 100,
    TotalInterest: Math.round(TotalInterest * 100) / 100,
    TotalRepayment: Math.round(TotalRepayment * 100) / 100,
    PaymentSchedule: paymentSchedule
  }
  

    // console.log(total.TotalCapital)
  
  
  

  return result



})


