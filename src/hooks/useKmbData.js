import { useState, useEffect, useCallback } from 'react';
import kmbAPI from '../services/KmbAPI';
import dataCache from '../services/DataCache';

export function useKmbData() {
  const [dataStats, setDataStats] = useState({
    cacheSize: 0,
    apiCalls: 0,
    cacheHits: 0,
    lastUpdate: null
  });

  const [isInitialized, setIsInitialized] = useState(false);

  // ✅ 首先定義 updateStats
  const updateStats = useCallback(() => {
    const stats = dataCache.getStats();
    const apiStats = kmbAPI.getCacheStats();
    
    setDataStats({
      cacheSize: stats.totalSizeKB,
      totalItems: stats.totalItems,
      validItems: stats.validItems,
      expiredItems: stats.expiredItems,
      apiCacheSize: apiStats.totalSize,
      lastUpdate: new Date()
    });
  }, []);

  // ✅ 然後定義 initializeData (用到 updateStats)
  const initializeData = useCallback(async () => {
    try {
      console.log('🚀 Initializing KMB data...');
      
      // 檢查緩存
      let routes = dataCache.getCachedRoutes();
      let stops = dataCache.getCachedStops();
      
      const promises = [];
      
      // 如果冇緩存，從API獲取
      if (!routes) {
        console.log('📡 Loading routes from API...');
        promises.push(
          kmbAPI.getAllRoutes().then(data => {
            dataCache.cacheRoutes(data);
            return data;
          })
        );
      }
      
      if (!stops) {
        console.log('📡 Loading stops from API...');
        promises.push(
          kmbAPI.getAllStops().then(data => {
            dataCache.cacheStops(data);
            return data;
          })
        );
      }
      
      if (promises.length > 0) {
        await Promise.all(promises);
        console.log('✅ Data initialization complete');
      } else {
        console.log('✅ Using cached data');
      }
      
      setIsInitialized(true);
      updateStats();
      
    } catch (error) {
      console.error('❌ Data initialization failed:', error);
      // 即使失敗都設為已初始化，讓app可以繼續運行
      setIsInitialized(true);
    }
  }, [updateStats]);

  // 清理過期數據
  const cleanupData = useCallback(() => {
    console.log('🧹 Cleaning up expired data...');
    dataCache.cleanup();
    kmbAPI.clearCache();
    updateStats();
  }, [updateStats]);

  // 完全清除緩存
  const clearAllData = useCallback(() => {
    console.log('🗑️ Clearing all cached data...');
    dataCache.clear();
    kmbAPI.clearCache();
    setIsInitialized(false);
    updateStats();
  }, [updateStats]);

  // 獲取數據使用量
  const getDataUsage = useCallback(() => {
    const today = new Date().toDateString();
    const usageKey = `data_usage_${today}`;
    
    try {
      const usage = JSON.parse(localStorage.getItem(usageKey) || '{"requests": 0, "bytes": 0}');
      return usage;
    } catch {
      return { requests: 0, bytes: 0 };
    }
  }, []);

  // 記錄數據使用
  const recordDataUsage = useCallback((bytes) => {
    const today = new Date().toDateString();
    const usageKey = `data_usage_${today}`;
    
    try {
      const usage = getDataUsage();
      usage.requests += 1;
      usage.bytes += bytes;
      localStorage.setItem(usageKey, JSON.stringify(usage));
    } catch (error) {
      console.error('Failed to record data usage:', error);
    }
  }, [getDataUsage]);

  useEffect(() => {
    // 應用啟動時初始化數據
    initializeData();
    
    // 每小時清理一次過期數據
    const cleanupInterval = setInterval(cleanupData, 60 * 60 * 1000);
    
    return () => {
      clearInterval(cleanupInterval);
    };
  }, [initializeData, cleanupData]);

  return {
    isInitialized,
    dataStats,
    initializeData,
    updateStats,
    cleanupData,
    clearAllData,
    getDataUsage,
    recordDataUsage
  };
}

// 數據性能監控 Hook
export function useDataMonitor() {
  const [performance, setPerformance] = useState({
    apiCalls: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageResponseTime: 0,
    errors: 0
  });

  const recordApiCall = useCallback((responseTime, fromCache = false, error = false) => {
    setPerformance(prev => ({
      apiCalls: prev.apiCalls + 1,
      cacheHits: prev.cacheHits + (fromCache ? 1 : 0),
      cacheMisses: prev.cacheMisses + (fromCache ? 0 : 1),
      averageResponseTime: ((prev.averageResponseTime * (prev.apiCalls - 1)) + responseTime) / prev.apiCalls,
      errors: prev.errors + (error ? 1 : 0)
    }));
  }, []);

  const getCacheHitRate = useCallback(() => {
    const total = performance.cacheHits + performance.cacheMisses;
    return total > 0 ? (performance.cacheHits / total * 100).toFixed(1) : 0;
  }, [performance]);

  const resetStats = useCallback(() => {
    setPerformance({
      apiCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      errors: 0
    });
  }, []);

  return {
    performance,
    recordApiCall,
    getCacheHitRate,
    resetStats
  };
}