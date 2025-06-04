import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import './App.css';
import Favorites from './components/Favorites';
import Nearby from './components/Nearby';
import { useKmbData } from './hooks/useKmbData';

// 測試標記 - Phase 2 with Real API Integration
console.log('🚌 KMB APP LOADED - PHASE 2 WITH REAL API');

function App() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // 🚀 使用KMB數據管理Hook
  const { 
    isInitialized, 
    dataStats, 
    //initializeData,
    getDataUsage 
  } = useKmbData();

  useEffect(() => {
    // 載入儲存嘅最愛巴士站（最多5個）
    const savedFavorites = localStorage.getItem('kmb_favorites');
    if (savedFavorites) {
      try {
        const parsedFavorites = JSON.parse(savedFavorites);
        setFavorites(Array.isArray(parsedFavorites) ? parsedFavorites : []);
      } catch (error) {
        console.error('Error parsing saved favorites:', error);
        localStorage.removeItem('kmb_favorites');
      }
    }
    setLoading(false);
  }, []);

  // 等待數據初始化完成
  useEffect(() => {
    if (isInitialized) {
      console.log('✅ KMB Data initialized:', dataStats);
      showToast('數據初始化完成！', 'success');
    }
  }, [isInitialized, dataStats]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const saveFavorite = (newFavorite) => {
    if (favorites.length >= 5) {
      showToast('最多只可以儲存5個最愛巴士站！', 'error');
      return false;
    }
    
    // 檢查是否已經存在
    const exists = favorites.some(fav => 
      fav.route === newFavorite.route && 
      fav.stop_id === newFavorite.stop_id && 
      fav.direction === newFavorite.direction
    );
    
    if (exists) {
      showToast('呢個巴士站已經在你嘅最愛入面！', 'warning');
      return false;
    }

    const updatedFavorites = [...favorites, newFavorite];
    localStorage.setItem('kmb_favorites', JSON.stringify(updatedFavorites));
    setFavorites(updatedFavorites);
    showToast(`已添加 ${newFavorite.route} 到最愛！`, 'success');
    return true;
  };

  const removeFavorite = (index) => {
    const removedFav = favorites[index];
    const updatedFavorites = favorites.filter((_, i) => i !== index);
    localStorage.setItem('kmb_favorites', JSON.stringify(updatedFavorites));
    setFavorites(updatedFavorites);
    showToast(`已移除 ${removedFav.route} 從最愛！`, 'info');
  };

  if (loading || !isInitialized) {
    return (
      <div className="App">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>🚌 KMB ETA</h2>
          <p>{!isInitialized ? '初始化數據中...' : 'Loading...'}</p>
          {dataStats.totalItems > 0 && (
            <div className="loading-stats">
              <p>已載入 {dataStats.totalItems} 項數據</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        {/* Toast Notification */}
        {toast && (
          <div className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        )}

        <header className="app-header">
          <h1>🚌 KMB ETA</h1>
          <p className="app-subtitle">Real-time Bus Information</p>
          {dataStats.cacheSize > 0 && (
            <div className="data-stats">
              <span>📊 緩存: {dataStats.cacheSize}KB</span>
            </div>
          )}
        </header>
        
        <nav className="app-nav">
          <Link to="/favorites" className="nav-link">
            ⭐ 最愛 ({favorites.length}/5)
          </Link>
          <Link to="/nearby" className="nav-link">
            📍 附近巴士站
          </Link>
        </nav>
        
        <main className="app-main">
          <Routes>
            <Route 
              path="/favorites" 
              element={
                <Favorites 
                  favorites={favorites}
                  onSaveFavorite={saveFavorite}
                  onRemoveFavorite={removeFavorite}
                  dataStats={dataStats}
                />
              } 
            />
            <Route 
              path="/nearby" 
              element={
                <Nearby 
                  onSaveFavorite={saveFavorite}
                  dataStats={dataStats}
                />
              } 
            />
            <Route path="/" element={<Navigate to="/favorites" replace />} />
          </Routes>
        </main>

        {/* Debug Panel (開發時顯示) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="debug-panel">
            <h4>🔧 Debug Info</h4>
            <p>API Ready: {isInitialized ? '✅' : '❌'}</p>
            <p>Cache Size: {dataStats.cacheSize}KB</p>
            <p>Total Items: {dataStats.totalItems}</p>
            <p>Data Usage: {JSON.stringify(getDataUsage())}</p>
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;