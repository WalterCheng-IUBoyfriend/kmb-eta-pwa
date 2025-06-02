import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>🚀 My PWA MVP</h1>
        <p>Welcome to your Progressive Web App!</p>
        
        <div className="feature-grid">
          <div className="feature-card">
            <h3>📱 Mobile Ready</h3>
            <p>Works perfectly on mobile devices</p>
          </div>
          <div className="feature-card">
            <h3>⚡ Fast Loading</h3>
            <p>Optimized for speed and performance</p>
          </div>
          <div className="feature-card">
            <h3>📴 Offline Support</h3>
            <p>Works even without internet connection</p>
          </div>
          <div className="feature-card">
            <h3>🏠 Installable</h3>
            <p>Can be installed on your home screen</p>
          </div>
        </div>
        
        <button className="install-button">
          Install App
        </button>
      </header>
    </div>
  );
}

export default App;