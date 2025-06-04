import React, { useState, useEffect, useCallback } from 'react';
import kmbAPI from './services/KmbAPI';

function ETA({ favorite, onChangeFavorite, showHeader = true, compact = false }) {
  const [etaData, setEtaData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchETA = useCallback(async () => {
    try {
      setError('');
      
      console.log('Fetching ETA for:', favorite);
      
      // 使用KmbAPI service而唔係直接fetch
      const route = favorite.route || '41A';
      const serviceType = favorite.service_type || '1';
      
      const data = await kmbAPI.getETA(favorite.stop_id, route, serviceType);
      console.log('ETA data:', data);
      
      if (data && Array.isArray(data)) {
        // 過濾出有效嘅 ETA 或者有 remarks
        const validETAs = data.filter(item => item.eta || item.rmk_en);
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
      return { time: timeString, status: '即將到站', minutes: 0 };
    } else if (diffMinutes <= 1) {
      return { time: timeString, status: '1分鐘', minutes: 1 };
    } else {
      return { time: timeString, status: `${diffMinutes}分鐘`, minutes: diffMinutes };
    }
  };

  const getStatusColor = (minutes) => {
    if (minutes <= 1) return '#ff4444'; // 紅色 - 即將到達
    if (minutes <= 5) return '#ff8800'; // 橙色 - 快到
    return '#4CAF50'; // 綠色 - 正常
  };

  if (loading) {
    return (
      <div className={compact ? "eta-loading-compact" : "eta-container"}>
        <div className="loading-section">
          <div className="loading-spinner"></div>
          <p>🚌 載入班次時間...</p>
        </div>
      </div>
    );
  }

  const containerClass = compact ? "eta-compact" : "eta-container";

  return (
    <div className={containerClass}>
      {showHeader && (
        <div className="stop-info">
          <h2>🚏 {favorite.stop_name || 'Bus Stop'}</h2>
          {favorite.stop_name_tc && (
            <p className="stop-name-tc">{favorite.stop_name_tc}</p>
          )}
          <p className="stop-details">
            路線 {favorite.route || '41A'} • {favorite.direction === 'inbound' ? '返程' : '往程'}
            {favorite.dest_name && ` → ${favorite.dest_name}`}
          </p>
        </div>
      )}

      {error ? (
        <div className="error-section">
          <h3>❌ 錯誤</h3>
          <p>{error}</p>
          <button onClick={fetchETA} className="retry-btn">
            🔄 重試
          </button>
        </div>
      ) : (
        <>
          <div className="eta-section">
            {!compact && (
              <div className="eta-header">
                <h3>🕐 下班巴士</h3>
                {lastUpdated && (
                  <p className="last-updated">
                    更新時間: {lastUpdated.toLocaleTimeString('en-HK', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}
              </div>
            )}

            {etaData.length === 0 ? (
              <div className="no-eta">
                <p>🚫 暫無班次</p>
                {!compact && <p className="sub-text">服務可能已結束或暫停</p>}
              </div>
            ) : (
              <div className="eta-list">
                {etaData.map((eta, index) => {
                  const timeInfo = eta.eta ? formatTime(eta.eta) : null;
                  
                  return (
                    <div key={index} className="eta-item">
                      <div className="eta-main">
                        {timeInfo ? (
                          <div className="eta-time">
                            <span className="time">{timeInfo.time}</span>
                            <span 
                              className="status"
                              style={{ color: getStatusColor(timeInfo.minutes) }}
                            >
                              {timeInfo.status}
                            </span>
                          </div>
                        ) : (
                          <div className="eta-remark">
                            <span className="remark">{eta.rmk_tc || eta.rmk_en || '暂无班次信息'}</span>
                          </div>
                        )}
                      </div>
                      
                      {eta.rmk_en && timeInfo && !compact && (
                        <div className="eta-remark-small">
                          {eta.rmk_tc || eta.rmk_en}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {!compact && (
            <div className="refresh-section">
              <button onClick={fetchETA} className="refresh-btn" disabled={loading}>
                🔄 刷新
              </button>
              <p className="auto-refresh-text">每30秒自動更新</p>
            </div>
          )}
        </>
      )}

      {!compact && onChangeFavorite && (
        <div className="actions-section">
          <button onClick={onChangeFavorite} className="change-stop-btn">
            🔄 更改最愛巴士站
          </button>
        </div>
      )}
    </div>
  );
}

export default ETA;