import React, { useState } from 'react';
import kmbAPI from '../services/KmbAPI';
import dataCache from '../services/DataCache';
import locationService from '../services/LocationService';

function Nearby({ onSaveFavorite }) {
  const [location, setLocation] = useState(null);
  const [nearbyStops, setNearbyStops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingSteps, setLoadingSteps] = useState('');

  const requestLocation = async () => {
    try {
      setLoading(true);
      setError('');
      setLoadingSteps('🔍 獲取你嘅位置...');

      // 1. 獲取用戶位置
      const userLocation = await locationService.getCurrentPosition();
      setLocation(userLocation);

      setLoadingSteps('📡 載入巴士站數據...');

      // 2. 獲取所有巴士站數據（優先使用緩存）
      let allStops = dataCache.getCachedStops();
      
      if (!allStops) {
        console.log('🔄 Fetching all stops from API...');
        allStops = await kmbAPI.getAllStops();
        dataCache.cacheStops(allStops);
      }

      setLoadingSteps('📍 搵緊附近巴士站...');

      // 3. 過濾500米內的巴士站
      const nearbyStopsData = locationService.filterStopsWithinRadius(
        allStops, 
        userLocation, 
        500
      );

      if (nearbyStopsData.length === 0) {
        setNearbyStops([]);
        setLoading(false);
        return;
      }

      setLoadingSteps('🚌 載入路線資訊...');

      // 4. 獲取每個巴士站的路線信息（最多前5個）
      const stopsWithRoutes = await Promise.all(
        nearbyStopsData.slice(0, 5).map(async (stop) => {
          try {
            const routes = await kmbAPI.getStopRoutes(stop.stop);
            
            // 只取前3個路線，避免過多資料
            const limitedRoutes = routes.slice(0, 3);
            
            // 獲取這些路線的ETA
            const routesWithETA = await Promise.all(
              limitedRoutes.map(async (route) => {
                try {
                  const eta = await kmbAPI.getETA(stop.stop, route.route, route.service_type);
                  return {
                    ...route,
                    eta: eta
                  };
                } catch (etaError) {
                  console.error(`ETA error for ${route.route}:`, etaError);
                  return {
                    ...route,
                    eta: []
                  };
                }
              })
            );

            return {
              ...stop,
              routes: routesWithETA
            };

          } catch (routeError) {
            console.error(`Route error for stop ${stop.stop}:`, routeError);
            return {
              ...stop,
              routes: []
            };
          }
        })
      );

      setNearbyStops(stopsWithRoutes);
      setLoadingSteps('');

    } catch (err) {
      console.error('❌ Nearby stops error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveFavoriteStop = (stop, route) => {
    const favorite = {
      route: route.route,
      direction: route.bound === 'O' ? 'outbound' : 'inbound',
      stop_id: stop.stop,
      stop_name: stop.name_en,
      stop_name_tc: stop.name_tc,
      service_type: route.service_type || '1'
    };

    if (onSaveFavorite(favorite)) {
      alert(`已將 ${route.route} - ${stop.name_en} 添加到最愛！`);
    }
  };

  const formatETA = (eta) => {
    if (!eta || eta.length === 0) {
      return '暫無班次';
    }

    const firstETA = eta[0];
    if (!firstETA.eta) {
      return firstETA.rmk_en || firstETA.rmk_tc || '暫無班次';
    }

    const etaTime = new Date(firstETA.eta);
    const now = new Date();
    const diffMinutes = Math.round((etaTime - now) / (1000 * 60));

    if (diffMinutes <= 0) {
      return '即將到站';
    } else if (diffMinutes <= 1) {
      return '1分鐘';
    } else {
      return `${diffMinutes}分鐘`;
    }
  };

  return (
    <div className="nearby-container">
      <div className="nearby-header">
        <h2>📍 附近巴士站</h2>
        <p className="nearby-subtitle">搵你附近500米範圍內嘅巴士站</p>
      </div>

      {!location && !loading && (
        <div className="location-request">
          <div className="location-icon">📍</div>
          <h3>需要你嘅位置權限</h3>
          <p>我地需要知道你嘅位置先可以搵到附近嘅巴士站</p>
          <button onClick={requestLocation} className="location-btn">
            🗺️ 獲取我嘅位置
          </button>
        </div>
      )}

      {loading && (
        <div className="loading-section">
          <div className="loading-spinner"></div>
          <p>{loadingSteps}</p>
        </div>
      )}

      {error && (
        <div className="error-section">
          <h3>❌ 錯誤</h3>
          <p>{error}</p>
          <button onClick={requestLocation} className="retry-btn">
            🔄 重試
          </button>
        </div>
      )}

      {location && nearbyStops.length > 0 && (
        <div className="nearby-results">
          <div className="location-info">
            <p>📍 你嘅位置: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>
            <p>搵到 {nearbyStops.length} 個附近巴士站</p>
          </div>

          <div className="stops-list">
            {nearbyStops.map((stop, index) => (
              <div key={index} className="stop-item">
                <div className="stop-info">
                  <h4>{stop.name_en}</h4>
                  {stop.name_tc && <p className="stop-name-tc">{stop.name_tc}</p>}
                  <p className="distance">📏 {locationService.formatDistance(stop.distance)}</p>
                </div>

                <div className="stop-routes">
                  {stop.routes.length === 0 ? (
                    <p className="no-routes">暫無路線資訊</p>
                  ) : (
                    stop.routes.map((route, routeIndex) => (
                      <div key={routeIndex} className="route-info">
                        <div className="route-header">
                          <span className="route-number">{route.route}</span>
                          <span className="route-eta">{formatETA(route.eta)}</span>
                          <button
                            onClick={() => saveFavoriteStop(stop, route)}
                            className="route-btn"
                            title={`添加 ${route.route} 到最愛`}
                          >
                            ➕
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="refresh-section">
            <button onClick={requestLocation} className="refresh-btn">
              🔄 重新搜尋
            </button>
          </div>
        </div>
      )}

      {location && nearbyStops.length === 0 && !loading && !error && (
        <div className="no-stops">
          <p>🚫 附近500米內搵唔到巴士站</p>
          <p className="sub-text">試下去其他地方或者擴大搜尋範圍</p>
        </div>
      )}
    </div>
  );
}

export default Nearby;