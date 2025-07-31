import { LoaderFunctionArgs, json } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  
  if (!query) {
    return json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  try {
    // First try with the original query to see if it matches Georgetown area
    let enhancedQuery = query;
    
    // Only add Georgetown context if it's not already in the query
    if (!query.toLowerCase().includes('georgetown') && 
        !query.toLowerCase().includes('washington') && 
        !query.toLowerCase().includes('dc')) {
      enhancedQuery = `${query} Georgetown Washington DC`;
    }
    
    const params = new URLSearchParams({
      q: enhancedQuery,
      format: 'json',
      limit: '5',
      addressdetails: '1',
      'accept-language': 'en',
      countrycodes: 'us'
    });

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        'User-Agent': 'OpenIndoorMaps/1.0'
      }
    });
    
    if (!response.ok) {
      console.warn('OSM geocoding failed:', response.status);
      return json({ error: 'Geocoding service unavailable' }, { status: response.status });
    }

    const data = await response.json();
    
    // Filter for Georgetown area results - be more lenient with filtering
    const filteredData = data.filter((location: any) => {
      const address = location.display_name.toLowerCase();
      
      // Check if it's in Georgetown area or Washington DC
      const isRelevant = address.includes('georgetown') || 
             address.includes('washington') || 
             address.includes('dc') ||
             address.includes('district of columbia') ||
             // Check coordinates to be within expanded Georgetown/DC area
             (parseFloat(location.lat) >= 38.88 && parseFloat(location.lat) <= 38.95 &&
              parseFloat(location.lon) >= -77.12 && parseFloat(location.lon) <= -77.00);
      
      return isRelevant;
    });
    
    return json(filteredData);
  } catch (error) {
    console.error('Error fetching OSM results:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
