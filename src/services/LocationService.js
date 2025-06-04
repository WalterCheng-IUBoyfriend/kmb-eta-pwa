import haversine from 'haversine-distance';

class LocationService {
  constructor() {
    this.currentLocation = null;
    this.watchId = null;
    this.callbacks = [];
  }

  // 獲取當前位置
  async getCurrentPosition(options = {}) {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5分鐘
    };

    const finalOptions = { ...defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          };

          this.currentLocation = location;
          console.log('📍 Location obtained:', location);
          resolve(location);
        },
        (error) => {
          console.error('❌ Geolocation error:', error);
          let message = 'Unable to get your location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location access denied. Please enable location permissions.';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out.';
              break;
          }
          
          reject(new Error(message));
        },
        finalOptions
      );
    });
  }

  // 計算兩點間距離（米）
  calculateDistance(point1, point2) {
    try {
      const distance = haversine(
        { latitude: point1.lat, longitude: point1.lng },
        { latitude: point2.lat, longitude: point2.lng }
      );
      return Math.round(distance);
    } catch (error) {
      console.error('❌ Distance calculation error:', error);
      return Infinity;
    }
  }

  // 過濾指定範圍內的巴士站
  filterStopsWithinRadius(stops, centerLocation, radiusMeters = 500) {
    if (!centerLocation || !stops || !Array.isArray(stops)) {
      return [];
    }

    const nearbyStops = stops
      .map(stop => {
        const stopLocation = {
          lat: parseFloat(stop.lat),
          lng: parseFloat(stop.long)
        };

        // 檢查座標是否有效
        if (isNaN(stopLocation.lat) || isNaN(stopLocation.lng)) {
          return null;
        }

        const distance = this.calculateDistance(centerLocation, stopLocation);
        
        return {
          ...stop,
          distance: distance,
          location: stopLocation
        };
      })
      .filter(stop => stop !== null && stop.distance <= radiusMeters)
      .sort((a, b) => a.distance - b.distance);

    console.log(`📍 Found ${nearbyStops.length} stops within ${radiusMeters}m`);
    return nearbyStops;
  }

  // 格式化距離顯示
  formatDistance(meters) {
    if (meters < 1000) {
      return `${meters}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  }

  // 檢查位置權限狀態
  async checkPermissions() {
    if (!navigator.permissions) {
      return 'unknown';
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state; // 'granted', 'denied', 'prompt'
    } catch (error) {
      console.error('❌ Permission check error:', error);
      return 'unknown';
    }
  }

  // 開始監聽位置變化
  startWatching(callback, options = {}) {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported');
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000 // 1分鐘
    };

    const finalOptions = { ...defaultOptions, ...options };

    this.callbacks.push(callback);

    if (!this.watchId) {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          };

          this.currentLocation = location;
          this.callbacks.forEach(cb => cb(location));
        },
        (error) => {
          console.error('❌ Watch position error:', error);
          this.callbacks.forEach(cb => cb(null, error));
        },
        finalOptions
      );
    }

    return this.watchId;
  }

  // 停止監聽位置變化
  stopWatching(callback = null) {
    if (callback) {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    } else {
      this.callbacks = [];
    }

    if (this.callbacks.length === 0 && this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      console.log('📍 Stopped watching location');
    }
  }

  // 獲取最後已知位置
  getLastKnownLocation() {
    return this.currentLocation;
  }

  // 清除位置數據
  clearLocation() {
    this.currentLocation = null;
    this.stopWatching();
  }
}

// 創建單例
const locationService = new LocationService();
export default locationService;