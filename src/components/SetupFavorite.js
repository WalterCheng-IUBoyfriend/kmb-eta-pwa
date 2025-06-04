import React, { useState, useEffect, useCallback } from 'react';
import kmbAPI from '../services/KmbAPI';
import dataCache from '../services/DataCache';
import locationService from '../services/LocationService';

function SetupFavorite({ onSave, onCancel }) {
  const [routes, setRoutes] = useState([]);
  const [filteredRoutes, setFilteredRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [direction, setDirection] = useState('outbound');
  const [stops, setStops] = useState([]);
  const [selectedStop, setSelectedStop] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [nearbyRoutes, setNearbyRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStops, setLoadingStops] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [showNearby, setShowNearby] = useState(true);

  // ✅ 將 loadRouteStops 移到前面
  const loadRouteStops = useCallback(async () => {
    if (!selectedRoute) return;

    try {
      setLoadingStops(true);
      setLoadingStep(`📍 載入 ${selectedRoute} 巴士站...`);

      const routeStops = await kmbAPI.getRouteStops(selectedRoute, direction);
      
      if (routeStops.length === 0) {
        alert(`路線 ${selectedRoute} ${direction === 'outbound' ? '往程' : '返程'} 暫無巴士站資料`);
        setStops([]);
        setSelectedStop('');
        return;
      }

      const stopIds = routeStops.map(stop => stop.stop);
      const stopsDetails = await kmbAPI.getStopsDetails(stopIds);
      
      const stopsWithDetails = routeStops.map(routeStop => {
        const stopDetail = stopsDetails.find(detail => detail?.stop === routeStop.stop);
        return {
          ...routeStop,
          name_en: stopDetail?.name_en || `Stop ${routeStop.seq}`,
          name_tc: stopDetail?.name_tc || `第${routeStop.seq}站`
        };
      });

      setStops(stopsWithDetails);
      setSelectedStop(stopsWithDetails[0]?.stop || '');
      
    } catch (error) {
      console.error('❌ Error loading route stops:', error);
      alert(`載入路線 ${selectedRoute} 巴士站失敗: ${error.message}`);
      setStops([]);
      setSelectedStop('');
    } finally {
      setLoadingStops(false);
      setLoadingStep('');
    }
  }, [selectedRoute, direction]);

  // 載入所有路線數據
  useEffect(() => {
    loadAllRoutes();
    loadNearbyRoutes();
  }, []);

  // ✅ 而家可以安全使用 loadRouteStops
  useEffect(() => {
    if (selectedRoute) {
      loadRouteStops();
    }
  }, [selectedRoute, direction, loadRouteStops]);

  // 處理搜尋過濾
  useEffect(() => {
    if (!routes.length) return;

    let filtered = routes;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = routes.filter(route => 
        route.route.toLowerCase().includes(query) ||
        route.orig_en.toLowerCase().includes(query) ||
        route.dest_en.toLowerCase().includes(query) ||
        route.orig_tc?.toLowerCase().includes(query) ||
        route.dest_tc?.toLowerCase().includes(query)
      );
    }

    // 將nearby routes排在前面
    const nearbyFirst = filtered.sort((a, b) => {
      const aIsNearby = nearbyRoutes.includes(a.route);
      const bIsNearby = nearbyRoutes.includes(b.route);
      
      if (aIsNearby && !bIsNearby) return -1;
      if (!aIsNearby && bIsNearby) return 1;
      return a.route.localeCompare(b.route);
    });

    setFilteredRoutes(nearbyFirst);
    
    // 自動選擇第一個路線
    if (nearbyFirst.length > 0 && !selectedRoute) {
      setSelectedRoute(nearbyFirst[0].route);
    }
  }, [routes, searchQuery, nearbyRoutes, selectedRoute]);

  const loadAllRoutes = async () => {
    try {
      setLoadingStep('📡 載入路線資料...');
      
      // 優先使用緩存
      let allRoutes = dataCache.getCachedRoutes();
      
      if (!allRoutes) {
        console.log('🔄 Fetching routes from API...');
        allRoutes = await kmbAPI.getAllRoutes();
        dataCache.cacheRoutes(allRoutes);
      }

      // 去重並分組 (同一路線可能有往返兩個方向)
      const routeMap = new Map();
      allRoutes.forEach(route => {
        const key = route.route;
        if (!routeMap.has(key)) {
          routeMap.set(key, {
            route: route.route,
            orig_en: route.orig_en,
            dest_en: route.dest_en,
            orig_tc: route.orig_tc,
            dest_tc: route.dest_tc,
            directions: []
          });
        }
        
        const routeData = routeMap.get(key);
        if (route.bound === 'O') {
          routeData.directions.push('outbound');
        } else if (route.bound === 'I') {
          routeData.directions.push('inbound');
        }
      });

      const uniqueRoutes = Array.from(routeMap.values());
      setRoutes(uniqueRoutes);
      
    } catch (error) {
      console.error('❌ Error loading routes:', error);
      alert('載入路線資料失敗，請重試');
    } finally {
      setLoading(false);
    }
  };

  const loadNearbyRoutes = async () => {
    try {
      if (!navigator.geolocation) return;

      const location = await locationService.getCurrentPosition();
      
      // 獲取所有巴士站
      let allStops = dataCache.getCachedStops();
      if (!allStops) {
        allStops = await kmbAPI.getAllStops();
        dataCache.cacheStops(allStops);
      }

      // 搵附近巴士站
      const nearbyStops = locationService.filterStopsWithinRadius(
        allStops, 
        location, 
        1000 // 1km範圍搵nearby routes
      );

      // 獲取附近巴士站嘅路線
      const routePromises = nearbyStops.slice(0, 5).map(async (stop) => {
        try {
          const stopRoutes = await kmbAPI.getStopRoutes(stop.stop);
          return stopRoutes.map(r => r.route);
        } catch {
          return [];
        }
      });

      const routeLists = await Promise.allSettled(routePromises);
      const allNearbyRoutes = routeLists
        .filter(result => result.status === 'fulfilled')
        .flatMap(result => result.value);

      const uniqueNearbyRoutes = [...new Set(allNearbyRoutes)];
      setNearbyRoutes(uniqueNearbyRoutes);
      
      console.log(`📍 Found ${uniqueNearbyRoutes.length} nearby routes:`, uniqueNearbyRoutes);
      
    } catch (error) {
      console.log('ℹ️ Could not get nearby routes:', error.message);
      setShowNearby(false);
    }
  };

  const handleSave = () => {
    if (!selectedRoute || !selectedStop) {
      alert('請選擇路線同巴士站');
      return;
    }

    const selectedStopData = stops.find(stop => stop.stop === selectedStop);
    const selectedRouteData = filteredRoutes.find(route => route.route === selectedRoute);
    
    const favorite = {
      route: selectedRoute,
      direction: direction,
      stop_id: selectedStop,
      stop_name: selectedStopData?.name_en || 'Unknown Stop',
      stop_name_tc: selectedStopData?.name_tc || '未知巴士站',
      service_type: '1',
      seq: selectedStopData?.seq,
      dest_name: direction === 'outbound' ? selectedRouteData?.dest_en : selectedRouteData?.orig_en
    };

    console.log('💾 Saving favorite:', favorite);
    onSave(favorite);
  };

  const getDirectionOptions = () => {
    if (!selectedRoute) return ['outbound'];
    
    const route = filteredRoutes.find(r => r.route === selectedRoute);
    return route?.directions || ['outbound'];
  };

  const isNearbyRoute = (route) => nearbyRoutes.includes(route);

  if (loading) {
    return (
      <div className="setup-modal">
        <div className="modal-content">
          <h3>🔄 載入中...</h3>
          <div className="loading-spinner"></div>
          <p>{loadingStep}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-modal">
      <div className="modal-content large">
        <h3>➕ 添加最愛巴士站</h3>
        
        {/* 搜尋框 */}
        <div className="search-section">
          <input
            type="text"
            placeholder="🔍 搜尋路線 (例如: 41A, 九巴, 機場)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {showNearby && nearbyRoutes.length > 0 && (
            <p className="nearby-hint">
              📍 搵到 {nearbyRoutes.length} 條附近路線 (會優先顯示)
            </p>
          )}
        </div>

        {/* 路線選擇 */}
        <div className="form-section">
          <label>🚌 路線:</label>
          <select 
            value={selectedRoute} 
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="form-select"
          >
            <option value="">請選擇路線</option>
            {filteredRoutes.map((route) => (
              <option key={route.route} value={route.route}>
                {route.route} {isNearbyRoute(route.route) ? '📍' : ''} 
                {route.orig_en} → {route.dest_en}
              </option>
            ))}
          </select>
        </div>

        {/* 方向選擇 */}
        {selectedRoute && (
          <div className="form-section">
            <label>🎯 方向:</label>
            <select 
              value={direction} 
              onChange={(e) => setDirection(e.target.value)}
              className="form-select"
            >
              {getDirectionOptions().includes('outbound') && (
                <option value="outbound">往程 (Outbound)</option>
              )}
              {getDirectionOptions().includes('inbound') && (
                <option value="inbound">返程 (Inbound)</option>
              )}
            </select>
          </div>
        )}

        {/* 巴士站選擇 */}
        {selectedRoute && (
          <div className="form-section">
            <label>🚏 巴士站:</label>
            {loadingStops ? (
              <div className="loading-stops">
                <div className="loading-spinner small"></div>
                <span>{loadingStep}</span>
              </div>
            ) : (
              <select 
                value={selectedStop} 
                onChange={(e) => setSelectedStop(e.target.value)}
                className="form-select"
                disabled={stops.length === 0}
              >
                <option value="">請選擇巴士站</option>
                {stops.map((stop) => (
                  <option key={stop.stop} value={stop.stop}>
                    {stop.seq}. {stop.name_en}
                    {stop.name_tc && ` (${stop.name_tc})`}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* 操作按鈕 */}
        <div className="modal-actions">
          <button 
            onClick={handleSave} 
            className="save-btn"
            disabled={!selectedRoute || !selectedStop || loadingStops}
          >
            💾 儲存最愛
          </button>
          <button onClick={onCancel} className="cancel-btn">
            ❌ 取消
          </button>
        </div>

        {/* 說明文字 */}
        <div className="modal-info">
          <p>💡 你可以儲存最多5個最愛巴士站</p>
          {showNearby && (
            <p>📍 標有位置符號嘅係你附近嘅路線</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default SetupFavorite;