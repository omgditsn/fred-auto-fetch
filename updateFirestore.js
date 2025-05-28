const axios = require('axios');
const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fetchFREDData() {
  const apiKey = process.env.FRED_API_KEY;
  const endpoints = {
    cpi: `https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCNS&api_key=${apiKey}&file_type=json`,
    interest: `https://api.stlouisfed.org/fred/series/observations?series_id=FEDFUNDS&api_key=${apiKey}&file_type=json`,
    oil: `https://api.stlouisfed.org/fred/series/observations?series_id=DCOILWTICO&api_key=${apiKey}&file_type=json`
  };

  const results = {};
  for (const [key, url] of Object.entries(endpoints)) {
    const response = await axios.get(url);
    const observations = response.data.observations;
    const latest = observations[observations.length - 1];
    results[key] = {
      date: latest.date,
      value: parseFloat(latest.value)
    };
  }

  return results;
}

async function uploadToFirestore() {
  const data = await fetchFREDData();
  const now = new Date();
  const docRef = db.collection('us_market').doc('latest');

  await docRef.set({
    ...data,
    updatedAt: now.toISOString()
  });

  console.log('✅ Data uploaded to Firestore');
}

uploadToFirestore().catch(console.error);
