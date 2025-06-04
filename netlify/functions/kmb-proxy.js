const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { 
      statusCode: 200, 
      headers, 
      body: '' 
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { endpoint } = event.queryStringParameters || {};
    
    if (!endpoint) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing endpoint parameter' })
      };
    }

    const kmbUrl = `https://data.etabus.gov.hk/v1/transport/kmb${endpoint}`;
    console.log('🚀 Proxying to KMB API:', kmbUrl);

    const response = await fetch(kmbUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'KMB-PWA-App/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`KMB API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('❌ Proxy error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch from KMB API',
        details: error.message 
      })
    };
  }
};