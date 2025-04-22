const { bucket } = require("./config/firebase");

async function testFirebase() {
  console.log("Firebase Storage Bucket Name:", bucket.name);
}

testFirebase();
