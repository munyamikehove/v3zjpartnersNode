const functions = require("firebase-functions");
const admin = require("firebase-admin");
const got = require("got");


const stripe = require(
    "stripe"
)(
    
);

const serviceAccount = require("./serviceAccountKey.json");
const clientServiceAccount = require("./serviceAccountKeyClient.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://zerojet-partners-default-rtdb.firebaseio.com",
});

const secondaryAppConfig = {
  credential: admin.credential.cert(clientServiceAccount),
  databaseURL: "https://zerojet-85661.firebaseio.com",
};

const secondary = admin.initializeApp(secondaryAppConfig, "secondary");

const fs = admin.firestore();
const clientFS = secondary.firestore();
// const db = admin.database();
// const clientDB = secondary.database();


exports.createBusinessCustomer = functions.https.onCall((data, context) => {
  const userID = data.userID;
  const userCountryCode = data.userCountryCode;

  let resultingData;
  let docRef;


  return stripe.accounts.create({
    country: userCountryCode,
    type: "express",
    capabilities: {
      card_payments: {
        requested: false,
      },
      transfers: {
        requested: true,
      },
    },
  }).then((response) => {
    docRef = fs.collection("businessData")
        .doc(userID)
        .collection("allUserDocuments")
        .doc("StripeAccount");


    resultingData = JSON.parse(JSON.stringify(response));

    console.log("customerCreationSuccess", resultingData);
    docRef.set({
      resultingData,
    });

    return {"stripeAccountID": resultingData["id"]};
  }).catch((err) => {
    docRef = fs.collection("businessData")
        .doc(userID)
        .collection("allUserDocuments")
        .doc("StripeAccount")
        .collection("Errors");


    resultingData = JSON.parse(JSON.stringify(err));
    console.log("customerCreationError", resultingData);
    docRef.add({
      "error": resultingData,
    });

    return resultingData;
  });
});

exports.createAccountLinkURL = functions.https.onCall((data, context) => {
  const userID = data.userID;
  const userAccountCode = data.userAccountCode;

  let resultingData;
  let docRef;

  return stripe.accountLinks.create({
    account: userAccountCode,
    refresh_url: "https://zerojet.com/reauth",
    return_url: "https://zerojet.com/return",
    type: "account_onboarding",
  }).then((response) => {
    docRef = fs.collection("businessData")
        .doc(userID)
        .collection("allUserDocuments")
        .doc("StripeAccountLink");


    resultingData = JSON.parse(JSON.stringify(response));
    console.log("customerCreationSuccess", resultingData);
    docRef.set({
      resultingData,
    });

    return {"stripeAccountLinkURL": resultingData["url"]};
  }).catch((err) => {
    docRef = fs.collection("businessData")
        .doc(userID)
        .collection("allUserDocuments")
        .doc("StripeAccountLink")
        .collection("Errors");


    resultingData = JSON.parse(JSON.stringify(err));
    console.log("customerCreationError", resultingData);
    docRef.add({
      "error": resultingData,
    });

    return "error";
  });
});

exports.customerLocation = functions.https.onCall((data, context) => {
  const url = "https://maps.googleapis.com/maps/api/distancematrix/json";
  const p1 = "avoid=tolls";
  const p2 = "units=metric";
  const p3 = "origins=place_id:ChIJL5NGETgzK4gRBKF9APVtNoo";
  const p4 = `destinations=place_id:${data.pid}`;
  const p5 = "key=AIzaSyDFvEiSFb2rqJV4kOYkxYZQ5nUhtYLR_Zw";
  const userID = data.userID;
  const storePOSRequestsStatus = data.storePOSRequestsStatus;
  let resultsRef;
  let resultingData;
  let resultingInfo;
  let destinationAddress;
  let BusinessGooglePlaceURL;
  let indexCounterSpace;
  let indexCounterComma;
  let indexCounterVerticalBar;


  got(`${url}?${p1}&${p2}&${p3}&${p4}&${p5}`).then((response) => {
    console.log(`${url}?${p1}&${p2}&${p3}&${p4}&${p5}`);
    console.log(response.body);

    resultingData = JSON.parse(response.body);
    destinationAddress = resultingData.destination_addresses[0];
    BusinessGooglePlaceURL = `https://www.google.com/maps/search/?api=1&query=${destinationAddress}&query_place_id=${data.pid}`;
    resultingInfo = resultingData.rows[0].elements[0].distance.value;


    do {
      indexCounterSpace = BusinessGooglePlaceURL.indexOf(" ");
      BusinessGooglePlaceURL = setCharAt(BusinessGooglePlaceURL, indexCounterSpace, "+");
      indexCounterSpace = BusinessGooglePlaceURL.indexOf(" ");
    }
    while (indexCounterSpace != -1);

    do {
      indexCounterComma = BusinessGooglePlaceURL.indexOf(",");
      BusinessGooglePlaceURL = setCharAt(BusinessGooglePlaceURL, indexCounterComma, "%2C");
      indexCounterComma = BusinessGooglePlaceURL.indexOf(",");
    }
    while (indexCounterComma != -1);

    do {
      indexCounterVerticalBar = BusinessGooglePlaceURL.indexOf("|");
      if (indexCounterVerticalBar != -1) {
        BusinessGooglePlaceURL = setCharAt(BusinessGooglePlaceURL, indexCounterVerticalBar, "%7C");
        indexCounterVerticalBar = BusinessGooglePlaceURL.indexOf("|");
      }
    }
    while (indexCounterVerticalBar != -1);

    function setCharAt(str, index, chr) {
      if (index > str.length-1) return str;
      return str.substring(0, index) + chr + str.substring(index+1);
    }

    console.log("Result is:", resultingInfo);

    if (storePOSRequestsStatus == "Active") {
      resultsRef = fs.collection("businessData")
          .doc(userID).collection("allUserDocuments")
          .doc("ZerojetAccount");
    } else {
      resultsRef = fs.collection("pendingPartners")
          .doc(userID);
    }


    resultsRef.set({
      "BusinessStreetAddress": destinationAddress,
      BusinessGooglePlaceURL,
    }, {merge: true});

    if (storePOSRequestsStatus == "Active") {
      const deleteOld = fs.collection("pendingPartners").doc(userID);
      deleteOld.delete();
    }
  }).catch((error) => {
    console.log(error.response.body);
  });
});

exports.addToPartnersDirectory = functions.https.onCall((data, context) => {
  const userID = data.userID;
  const BusinessAccessID = data.BusinessAccessID;
  const BusinessCity = data.BusinessCity;
  const BusinessDescription = data.description;
  const BusinessInstagramURL = data.BusinessInstagramURL;
  const BusinessName = data.BusinessName;
  const BusinessType = data.BusinessType;
  const imageOne = data.imageOne;
  const imageTwo = data.imageTwo;
  const imageThree = data.imageThree;
  const imageFour = data.imageFour;
  const mainImage = data.mainImage;


  const AccountType = data.AccountType;
  const BusinessCountry = data.BusinessCountry;
  const BusinessGooglePlaceID = data.BusinessGooglePlaceID;
  const BusinessGooglePlaceURL = data.BusinessGooglePlaceURL;
  const BusinessStreetAddress = data.BusinessStreetAddress;
  const CommissionRate = data.CommissionRate;
  const CompletedSetup = data.CompletedSetup;
  const FirstName = data.FirstName;
  const LastName = data.LastName;
  const PhoneNumber = data.PhoneNumber;
  const WorkEmail = data.WorkEmail;
  const storePOSRequestsStatus = data.storePOSRequestsStatus;

  let sector;
  let collectionSize = 0;


  switch (BusinessType) {
    case "Retail Store":
      // code block
      sector = "Shopping";
      break;
    case "Restaurant":
      // code block
      sector = "Restaurants";
      break;
    case "Indoor Activity":
      // code block
      sector = "Activities";
      break;
    case "Outdoor Activity":
      // code block
      sector = "Activities";
      break;
    case "Hotel/Motel":
      // code block
      sector = "Accommodations";
      break;
    case "Car Rental":
      // code block
      sector = "Mobility";
      break;
    default:
    // code block
  }


  clientFS.collection("vendors")
      .doc(BusinessCity)
      .collection(sector).get().then(function(querySnapshot) {
        if (querySnapshot.empty) {
          collectionSize = 0;
        } else {
          if (collectionSize.size == 1) {
            collectionSize = 1;
          } else {
            collectionSize = querySnapshot.size+1;
          }
        }
      });

  const clientDirectory = clientFS.collection("vendors")
      .doc(BusinessCity)
      .collection(sector)
      .doc(BusinessName);

  clientDirectory.set({

    "description": BusinessDescription,
    "imageFour": imageFour,
    "imageThree": imageThree,
    "imageTwo": imageTwo,
    "imageOne": imageOne,
    "collectionSizeID": collectionSize,
    "location": BusinessGooglePlaceURL,
    "title": BusinessName,
    "instagram": BusinessInstagramURL,
    "mainImage": mainImage,
    "BusinessAccessID": BusinessAccessID,
  }, {merge: true});

  const partnerBusinessRecord = fs.collection("businessData")
      .doc(userID)
      .collection("allUserDocuments")
      .doc("ZerojetAccount");

  partnerBusinessRecord.set({
    "description": BusinessDescription,
    "imageFour": imageFour,
    "imageThree": imageThree,
    "imageTwo": imageTwo,
    "imageOne": imageOne,
    BusinessCity,
    BusinessType,
    "collectionSizeID": collectionSize,
    "BusinessGooglePlaceURL": BusinessGooglePlaceURL,
    "BusinessName": BusinessName,
    "BusinessInstagramURL": BusinessInstagramURL,
    "mainImage": mainImage,
    "BusinessAccessID": BusinessAccessID,
    "AccountType": AccountType,
    "BusinessCountry": BusinessCountry,
    "BusinessGooglePlaceID": BusinessGooglePlaceID,
    "BusinessStreetAddress": BusinessStreetAddress,
    "CommissionRate": CommissionRate,
    "CompletedSetup": CompletedSetup,
    "FirstName": FirstName,
    "LastName": LastName,
    "PhoneNumber": PhoneNumber,
    "WorkEmail": WorkEmail,
    "storePOSRequestsStatus": storePOSRequestsStatus,
  }, {merge: true});

  const deleteOld = fs.collection("pendingPartners").doc(userID);
  deleteOld.delete();
});


