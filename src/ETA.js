import React, { useState, useEffect, useCallback } from 'react';

function ETA({ favorite, onChangeFavorite }) {
  const [etaData, setEtaData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchETA = useCallback(async () => {
    try {
      setError('');
      
      console.log('Fetching ETA for:', favorite);
      
      const response = await fetch(
        `https://data.etabus.gov.hk/v1/transport/kmb/eta/${favorite.stop_id}/41A/1`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Unable to load ETA`);
      }

      const data = await response.json();
      console.log('ETA data:', data);
      
      if (data.data) {
        // 過濾出有效嘅 ETA 或者有 remarks
        const validETAs = data.data.filter(item => item.eta || item.rmk_en);
        setEtaData(validETAs.slice(0, 3)); // 最多顯示3個
      } else {
        setEtaData([]);
      }
      
      setLastUpdated(new Date());
      
    } catch (err) {
      setError(`Error: ${err.message}`);
      console.error('Error fetching ETA:', err);
    } finally {
      setLoading(false);
    }
  }, [favorite]);

  useEffect(() => {
    fetchETA();
    // 每30秒自動更新一次
    const interval = setInterval(fetchETA, 30000);
    return () => clearInterval(interval);
  }, [fetchETA]);

  const formatTime = (etaString) => {
    if (!etaString) return null;
    
    const etaTime = new Date(etaString);
    const now = new Date();
    const diffMinutes = Math.round((etaTime - now) / (1000 * 60));
    
    const timeString = etaTime.toLocaleTimeString('en-HK', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    if (diffMinutes <= 0) {
      return { time: timeString, status: 'Arriving', minutes: 0 };
    } else if (diffMinutes <= 1) {
      return { time: timeString, status: '1 min', minutes: 1 };
    } else {
      return { time: timeString, status: `${diffMinutes} mins`, minutes: diffMinutes };
    }
  };

  const getStatusColor = (minutes) => {
    if (minutes <= 1) return '#ff4444'; // 紅色 - 即將到達
    if (minutes <= 5) return '#ff8800'; // 橙色 - 快到
    return '#4CAF50'; // 綠色 - 正常
  };

  if (loading) {
    return (
      <div className="eta-container">
        <div className="loading-section">
          <div className="loading-spinner"></div>
          <p>🚌 Loading bus times...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="eta-container">
      <div className="stop-info">
        <h2>🚏 {favorite.stop_name}</h2>
        {favorite.stop_name_tc && (
          <p className="stop-name-tc">{favorite.stop_name_tc}</p>
        )}
        <p className="stop-details">Stop {favorite.seq} • Route 41A → Tsim Sha Tsui East</p>
      </div>

      {error ? (
        <div className="error-section">
          <h3>❌ Error</h3>
          <p>{error}</p>
          <button onClick={fetchETA} className="retry-btn">
            🔄 Retry
          </button>
        </div>
      ) : (
        <>
          <div className="eta-section">
            <div className="eta-header">
              <h3>🕐 Next Buses</h3>
              {lastUpdated && (
                <p className="last-updated">
                  Updated: {lastUpdated.toLocaleTimeString('en-HK', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
            </div>

            {etaData.length === 0 ? (
              <div className="no-eta">
                <p>🚫 No upcoming buses</p>
                <p className="sub-text">Service may have ended or no buses scheduled</p>
              </div>
            ) : (
              <div className="eta-list">
                {etaData.map((eta, index) => {
                  const timeInfo = eta.eta ? formatTime(eta.eta) : null;
                  
                  return (
                    <div key={index} className="eta-item">
                      <div className="eta-main">
                        {timeInfo ? (
                          <>
                            <div className="eta-time">
                              <span className="time">{timeInfo.time}</span>
                              <span 
                                className="status"
                                style={{ color: getStatusColor(timeInfo.minutes) }}
                              >
                                {timeInfo.status}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="eta-remark">
                            <span className="remark">{eta.rmk_en || 'No ETA available'}</span>
                          </div>
                        )}
                      </div>
                      
                      {eta.rmk_en && timeInfo && (
                        <div className="eta-remark-small">
                          {eta.rmk_en}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="refresh-section">
            <button onClick={fetchETA} className="refresh-btn" disabled={loading}>
              🔄 Refresh
            </button>
            <p className="auto-refresh-text">Auto-refresh every 30 seconds</p>
          </div>
        </>
      )}

      <div className="actions-section">
        <button onClick={onChangeFavorite} className="change-stop-btn">
          🔄 Change Favorite Stop
        </button>
      </div>
    </div>
  );
}

export default ETA;