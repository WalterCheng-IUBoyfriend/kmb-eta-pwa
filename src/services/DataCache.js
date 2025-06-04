class DataCache {
    constructor() {
      this.prefix = 'kmb_app_';
    }
  
    // 設置緩存項目
    set(key, data, expiryHours = 24) {
      try {
        const item = {
          data: data,
          timestamp: Date.now(),
          expiry: Date.now() + (expiryHours * 60 * 60 * 1000)
        };
        
        localStorage.setItem(this.prefix + key, JSON.stringify(item));
        console.log(`💾 Cached: ${key} (${this.getSize(item)}KB, expires in ${expiryHours}h)`);
        
      } catch (error) {
        console.error(`❌ Cache set failed for ${key}:`, error);
        // 如果localStorage滿了，清除舊數據
        if (error.name === 'QuotaExceededError') {
          this.cleanup();
          // 重試 - 重新創建item object
          try {
            const retryItem = {
              data: data,
              timestamp: Date.now(),
              expiry: Date.now() + (expiryHours * 60 * 60 * 1000)
            };
            localStorage.setItem(this.prefix + key, JSON.stringify(retryItem));
          } catch (retryError) {
            console.error(`❌ Cache retry failed for ${key}:`, retryError);
          }
        }
      }
    }
  
    // 獲取緩存項目
    get(key) {
      try {
        const itemStr = localStorage.getItem(this.prefix + key);
        if (!itemStr) {
          return null;
        }
  
        const item = JSON.parse(itemStr);
        
        // 檢查是否過期
        if (Date.now() > item.expiry) {
          console.log(`⏰ Cache expired: ${key}`);
          this.remove(key);
          return null;
        }
  
        console.log(`🎯 Cache hit: ${key}`);
        return item.data;
  
      } catch (error) {
        console.error(`❌ Cache get failed for ${key}:`, error);
        this.remove(key); // 移除損壞的緩存
        return null;
      }
    }
  
    // 移除緩存項目
    remove(key) {
      localStorage.removeItem(this.prefix + key);
      console.log(`🗑️ Cache removed: ${key}`);
    }
  
    // 檢查是否存在且未過期
    has(key) {
      return this.get(key) !== null;
    }
  
    // 獲取所有緩存鍵
    keys() {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keys.push(key.substring(this.prefix.length));
        }
      }
      return keys;
    }
  
    // 清理過期項目
    cleanup() {
      console.log('🧹 Starting cache cleanup...');
      const keys = this.keys();
      let removedCount = 0;
  
      keys.forEach(key => {
        const item = this.get(key); // 這會自動移除過期項目
        if (!item) {
          removedCount++;
        }
      });
  
      console.log(`🧹 Cache cleanup completed: ${removedCount} expired items removed`);
    }
  
    // 獲取緩存統計
    getStats() {
      const keys = this.keys();
      let totalSize = 0;
      let validItems = 0;
      let expiredItems = 0;
  
      const stats = keys.map(key => {
        try {
          const itemStr = localStorage.getItem(this.prefix + key);
          const size = new Blob([itemStr]).size;
          totalSize += size;
  
          const item = JSON.parse(itemStr);
          const isExpired = Date.now() > item.expiry;
          
          if (isExpired) {
            expiredItems++;
          } else {
            validItems++;
          }
  
          return {
            key,
            size: Math.round(size / 1024), // KB
            expired: isExpired,
            age: Math.round((Date.now() - item.timestamp) / (1000 * 60)), // minutes
          };
        } catch (error) {
          expiredItems++;
          return { key, error: true };
        }
      });
  
      return {
        totalItems: keys.length,
        validItems,
        expiredItems,
        totalSizeKB: Math.round(totalSize / 1024),
        items: stats
      };
    }
  
    // 獲取數據大小（KB）
    getSize(data) {
      return Math.round(new Blob([JSON.stringify(data)]).size / 1024);
    }
  
    // 完全清空緩存
    clear() {
      const keys = this.keys();
      keys.forEach(key => this.remove(key));
      console.log(`🗑️ All cache cleared: ${keys.length} items removed`);
    }
  
    // 緩存KMB特定數據的便捷方法
    async cacheRoutes(routes) {
      this.set('routes', routes, 168); // 7日
    }
  
    async cacheStops(stops) {
      this.set('all_stops', stops, 168); // 7日
    }
  
    async cacheRouteStops(route, direction, stops) {
      this.set(`route_stops_${route}_${direction}`, stops, 24); // 1日
    }
  
    async cacheStopRoutes(stopId, routes) {
      this.set(`stop_routes_${stopId}`, routes, 1); // 1小時
    }
  
    // 獲取緩存的KMB數據
    getCachedRoutes() {
      return this.get('routes');
    }
  
    getCachedStops() {
      return this.get('all_stops');
    }
  
    getCachedRouteStops(route, direction) {
      return this.get(`route_stops_${route}_${direction}`);
    }
  
    getCachedStopRoutes(stopId) {
      return this.get(`stop_routes_${stopId}`);
    }
  }
  
  // 創建單例
  const dataCache = new DataCache();
  
  // 啟動時清理過期項目
  dataCache.cleanup();
  
  export default dataCache;