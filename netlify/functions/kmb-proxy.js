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

    // Add small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 100));

    // Enhanced headers to mimic real browser requests
    const response = await fetch(kmbUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-HK,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': 'https://data.etabus.gov.hk/',
        'Origin': 'https://data.etabus.gov.hk',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin'
      }
    });

    // Return the actual response status and data from KMB API
    const data = await response.json();

    return {
      statusCode: response.status,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Cache-Control': response.status === 200 ? 'public, max-age=300' : 'no-cache',
        'X-KMB-Status': response.status.toString()
      },
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('❌ Proxy error:', error);
    
    // Return actual error instead of fallback data
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch from KMB API',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};