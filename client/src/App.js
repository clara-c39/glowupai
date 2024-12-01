import React from 'react';
import CameraApp from './components/camera_app';

function App() {
  return (
    <div className="App" style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '10px',
      backgroundColor: '#f5f5f5',
    }}>
      {/* <h1 style={{
        fontSize: '4.5rem',
        fontWeight: 'normal',
        color: '#2196F3',
        marginBottom: '20px',
        textAlign: 'center',
        fontFamily: "'Pacifico', cursive",
        textTransform: 'none',
        letterSpacing: '2px',
        textShadow: '3px 3px 6px rgba(0, 0, 0, 0.2)',
        background: 'linear-gradient(45deg, #2196F3, #00BCD4)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        padding: '0 20px',
      }}>
        LooksMaxxer
      </h1> */}
      <CameraApp />
    </div>
  );
}

export default App;