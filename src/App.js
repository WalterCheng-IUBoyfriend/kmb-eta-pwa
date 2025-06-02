import React, { useState, useEffect } from 'react';
import './App.css';
import Setup from './Setup';
import ETA from './ETA';

// 測試標記 - 如果你睇到呢個，代表新代碼生效咗
console.log('🚌 KMB APP LOADED - NEW VERSION');


function App() {
  const [favorite, setFavorite] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 檢查係咪有儲存嘅最愛巴士站
    const savedFavorite = localStorage.getItem('kmb_favorite_stop');
    if (savedFavorite) {
      try {
        setFavorite(JSON.parse(savedFavorite));
      } catch (error) {
        console.error('Error parsing saved favorite:', error);
        localStorage.removeItem('kmb_favorite_stop');
      }
    }
    setLoading(false);
  }, []);

  const saveFavorite = (newFavorite) => {
    localStorage.setItem('kmb_favorite_stop', JSON.stringify(newFavorite));
    setFavorite(newFavorite);
  };

  const changeFavorite = () => {
    setFavorite(null);
  };

  if (loading) {
    return (
      <div className="App">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>🚌 KMB ETA</h2>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="app-header">
        <h1>🚌 KMB ETA</h1>
        <div className="route-info">
          <span className="route-number">41A</span>
          <span className="route-direction">青衣長安邨 → 尖沙咀東</span>
        </div>
      </header>
      
      <main className="app-main">
        {favorite ? (
          <ETA favorite={favorite} onChangeFavorite={changeFavorite} />
        ) : (
          <Setup onSaveFavorite={saveFavorite} />
        )}
      </main>
    </div>
  );
}

export default App;