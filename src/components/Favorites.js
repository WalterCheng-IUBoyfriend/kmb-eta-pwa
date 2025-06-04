import React, { useState } from 'react';
import ETA from '../ETA';
import SetupFavorite from './SetupFavorite';

function Favorites({ favorites, onSaveFavorite, onRemoveFavorite }) {
  const [showSetup, setShowSetup] = useState(false);

  // 如果冇最愛，顯示setup提示
  if (favorites.length === 0) {
    return (
      <div className="favorites-container">
        <div className="empty-favorites">
          <h2>⭐ 你嘅最愛巴士站</h2>
          <div className="empty-state">
            <p className="empty-icon">🚌</p>
            <p className="empty-text">你未有最愛巴士站</p>
            <p className="empty-subtext">
              去「附近巴士站」搵你嘅巴士站<br/>
              或者用搜尋功能添加最愛
            </p>
            <button 
              onClick={() => setShowSetup(true)}
              className="add-favorite-btn"
            >
              ➕ 添加第一個最愛
            </button>
          </div>
        </div>

        {showSetup && (
          <SetupFavorite 
            onSave={(favorite) => {
              if (onSaveFavorite(favorite)) {
                setShowSetup(false);
              }
            }}
            onCancel={() => setShowSetup(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="favorites-container">
      <div className="favorites-header">
        <h2>⭐ 你嘅最愛巴士站</h2>
        <p className="favorites-count">{favorites.length}/5 個最愛</p>
        {favorites.length < 5 && (
          <button 
            onClick={() => setShowSetup(true)}
            className="add-favorite-btn small"
          >
            ➕ 添加最愛
          </button>
        )}
      </div>

      <div className="favorites-list">
        {favorites.map((favorite, index) => (
          <div key={index} className="favorite-item">
            <div className="favorite-header">
              <span className="route-badge">{favorite.route}</span>
              <div className="favorite-info">
                <span className="direction-text">
                  {favorite.direction === 'inbound' ? '返程' : '往程'} 
                  {favorite.dest_name && ` → ${favorite.dest_name}`}
                </span>
                <span className="stop-name">{favorite.stop_name}</span>
              </div>
              <button 
                onClick={() => onRemoveFavorite(index)}
                className="remove-btn"
                title="移除最愛"
              >
                ❌
              </button>
            </div>
            
            <ETA 
              favorite={favorite}
              showHeader={false}
              compact={true}
            />
          </div>
        ))}
      </div>

      {showSetup && (
        <SetupFavorite 
          onSave={(favorite) => {
            if (onSaveFavorite(favorite)) {
              setShowSetup(false);
            }
          }}
          onCancel={() => setShowSetup(false)}
        />
      )}
    </div>
  );
}

export default Favorites;