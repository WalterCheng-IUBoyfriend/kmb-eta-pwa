class KmbAPI {
    constructor() {
      // 🌐 使用Netlify Functions
      this.proxyURL = process.env.NODE_ENV === 'production' 
        ? '/.netlify/functions/kmb-proxy'  // Production: 你嘅Netlify site
        : 'http://localhost:8888/.netlify/functions/kmb-proxy'; // Local dev with Netlify CLI
        
      this.baseURL = 'https://data.etabus.gov.hk/v1/transport/kmb';
      this.cache = new Map();
      this.requestQueue = new Map();
    }
  
    // 通用API請求方法
    async makeRequest(endpoint, cacheKey = null, cacheDuration = 300000) { // 5分鐘默認緣存
      try {
        // 檢查緩存
        if (cacheKey && this.cache.has(cacheKey)) {
          const cached = this.cache.get(cacheKey);
          if (Date.now() - cached.timestamp < cacheDuration) {
            console.log(`🎯 Cache hit: ${cacheKey}`);
            return cached.data;
          }
        }
  
        // 避免重複請求
        if (this.requestQueue.has(endpoint)) {
          console.log(`⏳ Request queued: ${endpoint}`);
          return await this.requestQueue.get(endpoint);
        }
  
        // 創建新請求
        const requestPromise = this.fetchData(endpoint);
        this.requestQueue.set(endpoint, requestPromise);
  
        const data = await requestPromise;
        
        // 清除請求隊列
        this.requestQueue.delete(endpoint);
  
        // 緩存結果
        if (cacheKey) {
          this.cache.set(cacheKey, {
            data: data,
            timestamp: Date.now()
          });
        }
  
        return data;
  
      } catch (error) {
        this.requestQueue.delete(endpoint);
        throw error;
      }
    }
  
    async fetchData(endpoint) {
      try {
        const proxyUrl = `${this.proxyURL}?endpoint=${encodeURIComponent(endpoint)}`;
        console.log(`🚀 API Request via Netlify function: ${endpoint}`);

        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Proxy error response:`, errorText);
          throw new Error(`Proxy Error ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result || !Array.isArray(result.data)) {
          console.warn(`⚠️ Unexpected data structure:`, result);
          return []; // Return empty array instead of throwing
        }

        console.log(`✅ API Success: ${endpoint} (${result.data.length} items)`);
        return result.data;

      } catch (error) {
        console.error(`❌ Proxy request failed for ${endpoint}:`, error);
        throw error;
      }
    }
  
    // 1. 獲取所有路線 (~50KB)
    async getAllRoutes() {
      return await this.makeRequest('/route', 'all_routes', 604800000); // 7日緩存
    }
  
    // 2. 獲取所有巴士站 (~1MB) 
    async getAllStops() {
      return await this.makeRequest('/stop', 'all_stops', 604800000); // 7日緩存
    }
  
    // 3. 獲取特定路線嘅巴士站
    async getRouteStops(route, direction = 'outbound', serviceType = '1') {
      const directionMap = {
        'outbound': 'O',
        'inbound': 'I'
      };
      
      const boundCode = directionMap[direction] || 'O';
      const endpoint = `/route-stop/${route}/${boundCode}/${serviceType}`;
      const cacheKey = `route_stops_${route}_${direction}_${serviceType}`;
      
      return await this.makeRequest(endpoint, cacheKey, 86400000); // 1日緩存
    }
  
    // 4. 獲取特定巴士站嘅路線
    async getStopRoutes(stopId) {
      const endpoint = `/stop-route/${stopId}`;
      const cacheKey = `stop_routes_${stopId}`;
      
      return await this.makeRequest(endpoint, cacheKey, 3600000); // 1小時緩存
    }
  
    // 5. 獲取ETA數據
    async getETA(stopId, route, serviceType = '1') {
      const endpoint = `/eta/${stopId}/${route}/${serviceType}`;
      // ETA不緩存，每次都要最新數據
      return await this.makeRequest(endpoint, null, 0);
    }
  
    // 6. 獲取特定巴士站詳情
    async getStop(stopId) {
      const endpoint = `/stop/${stopId}`;
      const cacheKey = `stop_${stopId}`;
      
      return await this.makeRequest(endpoint, cacheKey, 604800000); // 7日緩存
    }
  
    // 批量獲取巴士站詳情
    async getStopsDetails(stopIds) {
      const promises = stopIds.map(stopId => this.getStop(stopId));
      const results = await Promise.allSettled(promises);
      
      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value[0]; // API returns array with single item
        } else {
          console.error(`Failed to get stop ${stopIds[index]}:`, result.reason);
          return null;
        }
      }).filter(Boolean);
    }
  
    // 清除緩存
    clearCache() {
      this.cache.clear();
      console.log('🗑️ KMB API cache cleared');
    }
  
    // 獲取緩存統計
    getCacheStats() {
      return {
        size: this.cache.size,
        keys: Array.from(this.cache.keys()),
        totalSize: JSON.stringify(Array.from(this.cache.entries())).length
      };
    }
  }
  
  // 創建單例
  const kmbAPI = new KmbAPI();
  export default kmbAPI;