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

    // 使用native fetch (Node.js 18+ available in Netlify)
    const response = await fetch(kmbUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'KMB-PWA-App/1.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`KMB API Error: ${response.status} ${response.statusText}`);
      throw new Error(`KMB API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // 5分鐘緩存
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