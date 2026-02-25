const https = require('https');

const CONFIG = {
  DEVELOPER_TOKEN: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
  CUSTOMER_ID: process.env.GOOGLE_ADS_CUSTOMER_ID,
  CLIENT_ID: process.env.GOOGLE_ADS_CLIENT_ID,
  CLIENT_SECRET: process.env.GOOGLE_ADS_CLIENT_SECRET,
  REFRESH_TOKEN: process.env.GOOGLE_ADS_REFRESH_TOKEN,
};

function httpsRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  // Get token
  const authData = `grant_type=refresh_token&client_id=${CONFIG.CLIENT_ID}&client_secret=${CONFIG.CLIENT_SECRET}&refresh_token=${CONFIG.REFRESH_TOKEN}`;
  const authRes = await httpsRequest({
    hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(authData) }
  }, authData);
  const token = JSON.parse(authRes.body).access_token;
  console.log('Token:', token ? 'OK' : 'FAIL');

  // Try create budget
  const body = JSON.stringify({
    mutateOperations: [{
      campaignBudgetOperation: {
        create: {
          name: "Test Budget",
          amountMicros: "150000000",
          deliveryMethod: "STANDARD",
          explicitlyShared: false
        }
      }
    }]
  });

  const res = await httpsRequest({
    hostname: 'googleads.googleapis.com',
    path: `/v20/customers/${CONFIG.CUSTOMER_ID}/googleAds:mutate`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'developer-token': CONFIG.DEVELOPER_TOKEN,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    }
  }, body);

  console.log('Status:', res.status);
  console.log('Response:', res.body);
}

run().catch(console.error);
