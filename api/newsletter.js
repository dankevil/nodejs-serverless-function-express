// api/newsletter.js

const fetch = require('node-fetch');

// Zoho CRM credentials
const client_id = "1000.5KIZVS4J456L0OLREEUBR18OMOI54T";
const client_secret = "522390f40c11579c52bec7a303cb77c9e0a07b6968";
let access_token = "1000.3a851fd19d5c4024168afc07c6adee5d.0cd445b80c31dd900cf75edd87cd62f3";
const refresh_token = "1000.496937ca2b7acf766ac36e406051150c.1c5f8cd83d652125d414640feebf296e";

// Refresh Zoho access token
async function refreshAccessToken() {
  const url = `https://accounts.zoho.in/oauth/v2/token?refresh_token=${refresh_token}&client_id=${client_id}&client_secret=${client_secret}&grant_type=refresh_token`;
  const res = await fetch(url, { method: 'POST' });
  const data = await res.json();
  if (data.access_token) {
    access_token = data.access_token;
  }
}

// Serverless function handler
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { email } = req.body;

  // Email validation
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email address' });
  }

  const zohoData = {
    data: [
      {
        First_Name: email,
        Last_Name: email,
        Email: email,
        Lead_Source: "orvidigestNLS"
      }
    ]
  };

  // Try first submission
  let zohoRes = await fetch("https://www.zohoapis.in/crm/v2/Leads", {
    method: "POST",
    headers: {
      "Authorization": "Zoho-oauthtoken " + access_token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(zohoData)
  });

  let result = await zohoRes.json();

  // Retry once if token invalid
  if (result.code === "INVALID_TOKEN" || result.code === "AUTHENTICATION_FAILURE") {
    await refreshAccessToken();

    zohoRes = await fetch("https://www.zohoapis.in/crm/v2/Leads", {
      method: "POST",
      headers: {
        "Authorization": "Zoho-oauthtoken " + access_token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(zohoData)
    });

    result = await zohoRes.json();
  }

  // Success or failure response
  if (zohoRes.ok && result.data && result.data[0].code === "SUCCESS") {
    res.status(200).json({ success: true });
  } else {
    res.status(500).json({ success: false, error: result });
  }
};
