exports.handler = async (event, context) => {
  const API_KEY = process.env.TWELVE_DATA_API_KEY;
  
  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key not configured' })
    };
  }

  // Parse query parameters
  const params = new URLSearchParams(event.rawQuery);
  const endpoint = params.get('endpoint'); // 'quote' or 'time_series'
  
  if (!endpoint) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Endpoint parameter is required' })
    };
  }

  // Remove the endpoint parameter from params to forward the rest
  params.delete('endpoint');
  
  // Add the API key
  params.set('apikey', API_KEY);
  
  // Build the API URL
  const baseUrl = 'https://api.twelvedata.com';
  const apiUrl = `${baseUrl}/${endpoint}?${params.toString()}`;

  try {
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          error: `API request failed with status ${response.status}` 
        })
      };
    }

    const data = await response.json();
    
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('Error fetching from Twelve Data API:', error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: 'Failed to fetch data from API' })
    };
  }
};