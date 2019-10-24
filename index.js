const functions = require('firebase-functions');
const admin = require('firebase-admin');
var crypto = require('crypto');
var rp = require("request-promise");
var request = require('request');
// admin.initializeApp();
const Nexmo = require('nexmo');
const sgMail = require('@sendgrid/mail');
require('dotenv').config();



// Initialinng a admin on local server, **Would revert to this for only local testing**

var serviceAccount = require("/Users/mac/Downloads/shecluded-firebase-adminsdk-c8lsf-7702979dd3.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://shecluded.firebaseio.com"
});
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
      return db.collection('users').where("userID", "==" ,"M2t5HiCLYHat3iZ2qrB586Fq6rI2").get()
      
      
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
  const userDoc = await db.collection("users").where("userID", "==","M2t5HiCLYHat3iZ2qrB586Fq6rI2").get()

  userDoc.forEach(async(doc) =>{
    

   docID = doc.id
  
   options.body.name = doc.data().firstName
  })

  const bank = await db.collection("users").doc(docID).collection("finance").doc("bank_details").get()

  // console.log(bank.data())
   options.body.account_number =    bank.data().accountNumber
    options.body.bank_code = bank.data().bankCode
    // console.log(bank)
  //  console.log(options.body)

  return rp(options)
  .then((res)=>{
    return bank.ref.set({recipientCode:res.data.recipient_code},{merge:true})
  })
  .then(()=>{
    return {success: true}
  })
  .catch((err)=>{
    return err.error
  })
  


})


//LOAN FUNCTION

function calculate_loan(loan){

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
      capital: Math.round(capitalPayment), 
      interest: Math.round(interest),
      repayment:Math.round(amort),
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

}

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
      capital: Math.round(capitalPayment), 
      interest: Math.round(interest),
      repayment:Math.round(amort),
    }
    TotalCapital += payment.capital
    TotalInterest += payment.interest
    TotalRepayment += payment.repayment
    
  
    
    paymentSchedule.push(payment)

    p -= capitalPayment
  }

  let result = {
    TotalCapital: Math.round(TotalCapital ) ,
    TotalInterest: Math.round(TotalInterest),
    TotalRepayment: Math.round(TotalRepayment),
    PaymentSchedule: paymentSchedule
  }
  

    // console.log(total.TotalCapital)
  
  
  

  return result



})

exports.Loan_Approve = functions.https.onCall(async(docID,context)=>{

  //Paystack transfer detials
  var options = { 
    headers: { Authorization:  "Bearer " +process.env.PAYSTACK_SECRET },
    method: 'POST',
    uri: 'https://api.paystack.co/transfer',
    body:{
      source: "balance",
      amount: '',
      recipient: ""
    },
    json: true // Automatically stringifies the body to JSON


  };


  //Get current data
  var today = new Date()
  


  //Change loan status to approve and set the approval data and also the next payment day
  var data = {
    loanStatus : "approved",
    loanApproveDate: admin.firestore.Timestamp.now(),
    nextRepaymentDate: '',
    nextRepayment: 0,
    numberofPayments: ''

  }
  // Get loan and loan amount and set the paystack trasfer amount
  const loan = await db.collection("loans").doc(docID).get()
  //option.body is the paystack tranfer about being set to the loan amount
  options.body.amount = loan.data().loanAmount
  data.numberofPayments = loan.data().loanDuration
 

  ///
  

  

  // This if statement dynamically set the next payment date of the loan based on if the loan is monthly or weekly
  if(loan.data().loanTerm === "weekly"){
    
    today.setDate(today.getDate()+7) 
    data.nextRepaymentDate = admin.firestore.Timestamp.fromDate(today)
  } else if(loan.data().loanTerm === "monthly"){
    today.setMonth(today.getMonth()+1)
    data.nextRepaymentDate = admin.firestore.Timestamp.fromDate(today)
  }
  
  // Get user recipeient ID for transfer for paystack
  var  recipientCode

  
  const user = await db.collection("users").where("userID", "==",loan.data().userID).get()

  user.forEach(async(doc) =>{
    
    await doc.ref.collection("finance").doc("bank_details").get().then((doc)=>{

      options.body.recipient = doc.data().recipientCode 
      console.log(doc.data())
      console.log(recipientCode)
      return
    })
    
  
  })
  
  // console.log(recipientCode)
  
  return loan.ref.set(data,{merge:true})
  .then((res)=>{
    return rp(options)
  })
  .then((res)=>{
    // The transfer_code should be saved and used along with OTP to confirm transactions
    return res
  })
})

exports.Paystack_Approve_transfer = functions.https.onCall((load,context)=>{


  var options = { 
    headers: { Authorization:  "Bearer " +process.env.PAYSTACK_SECRET },
    method: 'POST',
    uri: 'https://api.paystack.co/transfer/finalize_transfer',
    body:{
      transfer_code: load.code,
      otp: load.otp
    },
    json: true // Automatically stringifies the body to JSON


  };

  
  return rp(options)
  

})

exports.Paystack_Resend_OTP = functions.https.onCall((code)=>{

  var options = { 
    headers: { Authorization:  "Bearer " +process.env.PAYSTACK_SECRET },
    method: 'POST',
    uri: 'https://api.paystack.co/transfer/resend_otp',
    body:{
      transfer_code: code,
      reason: "transfer"
      
    },
    json: true // Automatically stringifies the body to JSON


  };
  return rp(options)

})

exports.Payment_Collector = functions.pubsub.schedule('0 11 * * *').onRun(async(context)=>{

  //paystack options
  var options = { 
    headers: { Authorization:  "Bearer " +process.env.PAYSTACK_SECRET },
    method: 'POST',
    uri: 'https://api.paystack.co/transaction/charge_authorization',
    body:'',
    json: true // Automatically stringifies the body to JSON


  };

  const today = new Date()
  //get alls active loans
  const activeLoans = await db.collection("loans").where("loanStatus","==","approved").get()
  const promises = []
  const results = []


  //bolean for if there is a loan due today
  var anyloan = false

  var loanz = []
  var loanID = []

  for(loan of activeLoans.docs){

  

    // activeLoans.forEach(async(loan)=> {

    // Get the due dates of all active loans
    const dueDate = loan.data().nextRepaymentDate.toDate()

    //checks to see if a loan is due today Checks the month first
    if(dueDate.getMonth()===today.getMonth()){
      if(dueDate.getDate()===today.getDate()){
        var loans = {
          
          amount: '',
          authorization_code: '',
          email: '',
          // queue:true

        }
        var ID = {
          loanID: loan.id,
          lender: '',
          repaymentAmount: ''
        }
        anyloan = true

        //loan is due today
        console.log("Your loan", '=>', loan.id,"is due today",loan.data().userID)
        // loanID.push(loan.id)

        //get current payment number
        let pay = loan.data().nextRepayment

        //get loan amount and convert to kobo
        loans.amount = Math.round(loan.data().PaymentSchedule[pay].repayment*100)
        console.log('loan amount',loan.data().TotalCapital)
        ID.repaymentAmount = loan.data().PaymentSchedule[pay].repayment

        // gather user details to charge
        // eslint-disable-next-line no-await-in-loop
        const users =  await db.collection("users").where("userID","==",loan.data().userID).get()
        // console.log("we made it")
        


        for(user of users.docs){
          
          // eslint-disable-next-line no-await-in-loop
          const payment = await user.ref.collection("finance").doc("paystack_auth").get()
          loans.authorization_code = payment.data().authorization_code
          console.log(payment.data().authorization_code)
          loans.email = user.data().email
          ID.lender = user.data().email
        }
        
        // loan object ready for payment
        // console.dir(loans)
        loanz.push(loans)        

         loanID.push(ID)
        
        
      }
      
    }


    //set the loan data
    
  
  
    
  }
  // checks if there is any loan = true and begings processing the loans
  if(anyloan){
    
   console.dir(loanz)
   // loops through all the collected loan data
   for(loan of loanz){
    // set the loan data for paystack
    options.body = loan
    // collects the loan promise for each loan
    const p =  rp(options)
    // pushes the promise to a global variable
    promises.push(p)
   }
   // waits for all promises to resolve
   const payments = await Promise.all(promises)

   //Get 
   for(payment of payments){
     // get payment details
     let details = {
       //converting from kobo to naira
       amount: payment.data.amount/100,
       status: payment.data.status,
       reference: payment.data.reference,
       email: payment.data.customer.email,
       customer_code: payment.data.customer.customer_code,
       date: admin.firestore.Timestamp.now()
     }
     results.push(details)

    //  console.dir(payment)

   }
    const result = {
      date: new Date().toDateString(),
      loans: loanID,
      payments: results
      
    }
    await db.collection("repayments").add(result)
   
  
  }else{
    console.log("no loans due today")

  }
  
  return

})

exports.Payment_Confirmer = functions.https.onCall(async(blah)=>{
  //paystack options
  var options = { 
    headers: { Authorization:  "Bearer " +process.env.PAYSTACK_SECRET },
    method: 'GET',
    uri: 'https://api.paystack.co/bulkcharge',
    body:'',
    json: true // Automatically stringifies the body to JSON


  };
  //get the currean
  const today = new Date().toDateString()
  console.log(today)

  const payments =  await db.collection("repayments").where("date","==",today).get()

    snap.forEach((snaps)=>{
      
      console.log(snaps.data())
    })
    return {status:"we out here collecting loans"}
  
  .catch((err)=>{
    return err
  })

  


})
