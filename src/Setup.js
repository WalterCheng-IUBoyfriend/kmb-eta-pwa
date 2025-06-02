import React, { useState, useEffect } from 'react';

function Setup({ onSaveFavorite }) {
  const [stops, setStops] = useState([]);
  const [selectedStop, setSelectedStop] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadingStopNames, setLoadingStopNames] = useState(false);

  useEffect(() => {
    fetchStops();
  }, []);

  const fetchStops = async () => {
    try {
      setLoading(true);
      setError('');

      // 檢查 cache
      const cacheKey = 'stops_41A_outbound';
      const cachedStops = localStorage.getItem(cacheKey);
      
      if (cachedStops) {
        const parsedStops = JSON.parse(cachedStops);
        setStops(parsedStops);
        setSelectedStop(parsedStops[0]?.stop || '');
        setLoading(false);
        return;
      }

      console.log('Fetching route stops...');
      
      // 獲取巴士站列表
      const routeResponse = await fetch(
        'https://data.etabus.gov.hk/v1/transport/kmb/route-stop/41A/outbound/1'
      );
      
      if (!routeResponse.ok) {
        throw new Error(`HTTP ${routeResponse.status}: Unable to load stops`);
      }

      const routeData = await routeResponse.json();
      console.log('Route data:', routeData);

      if (!routeData.data || routeData.data.length === 0) {
        throw new Error('No stops found for route 41A');
      }

      setLoadingStopNames(true);
      
      // 獲取巴士站名稱 (批量處理，避免太多同時請求)
      const stopsWithNames = [];
      for (let i = 0; i < routeData.data.length; i += 5) {
        const batch = routeData.data.slice(i, i + 5);
        const batchPromises = batch.map(async (stop) => {
          try {
            const stopResponse = await fetch(
              `https://data.etabus.gov.hk/v1/transport/kmb/stop/${stop.stop}`
            );
            if (stopResponse.ok) {
              const stopData = await stopResponse.json();
              return {
                ...stop,
                name_en: stopData.data.name_en,
                name_tc: stopData.data.name_tc
              };
            }
            return { ...stop, name_en: `Stop ${stop.seq}`, name_tc: `第${stop.seq}站` };
          } catch {
            return { ...stop, name_en: `Stop ${stop.seq}`, name_tc: `第${stop.seq}站` };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        stopsWithNames.push(...batchResults);
        
        // 小延遲避免 API rate limit
        if (i + 5 < routeData.data.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // 儲存到 cache
      localStorage.setItem(cacheKey, JSON.stringify(stopsWithNames));
      setStops(stopsWithNames);
      setSelectedStop(stopsWithNames[0]?.stop || '');
      
    } catch (err) {
      setError(`Error: ${err.message}. Please check your internet connection.`);
      console.error('Error fetching stops:', err);
    } finally {
      setLoading(false);
      setLoadingStopNames(false);
    }
  };

  const handleSave = () => {
    if (!selectedStop) {
      alert('Please select a stop');
      return;
    }

    const selectedStopData = stops.find(stop => stop.stop === selectedStop);
    
    const favoriteData = {
      route: '41A',
      direction: 'outbound',
      stop_id: selectedStop,
      service_type: '1',
      stop_name: selectedStopData?.name_en || `Stop ${selectedStopData?.seq}`,
      stop_name_tc: selectedStopData?.name_tc || `第${selectedStopData?.seq}站`,
      seq: selectedStopData?.seq
    };

    console.log('Saving favorite:', favoriteData);
    onSaveFavorite(favoriteData);
  };

  if (loading) {
    return (
      <div className="setup-container">
        <div className="loading-section">
          <div className="loading-spinner"></div>
          <p>📡 Loading bus stops...</p>
          {loadingStopNames && <p className="sub-text">Getting stop names...</p>}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="setup-container">
        <div className="error-section">
          <h3>❌ Error</h3>
          <p>{error}</p>
          <button onClick={fetchStops} className="retry-btn">
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-container">
      <div className="setup-header">
        <h2>🚏 Choose Your Favorite Stop</h2>
        <p>Select the bus stop you use most often for route 41A:</p>
      </div>
      
      <div className="stop-selector">
        <label htmlFor="stop-select">Bus Stop:</label>
        <select 
          id="stop-select"
          value={selectedStop} 
          onChange={(e) => setSelectedStop(e.target.value)}
          className="stop-dropdown"
        >
          {stops.map((stop) => (
            <option key={stop.stop} value={stop.stop}>
              {stop.seq}. {stop.name_en} {stop.name_tc && `(${stop.name_tc})`}
            </option>
          ))}
        </select>
      </div>

      <button onClick={handleSave} className="save-btn">
        💾 Save Favorite Stop
      </button>
      
      <div className="info-section">
        <p className="info-text">
          💡 This will be saved for quick access next time you open the app
        </p>
      </div>
    </div>
  );
}

export default Setup;