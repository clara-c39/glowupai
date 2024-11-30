import React, { useRef, useState, useEffect } from 'react';

function CameraApp() {
  const videoRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
    }
  };

  const startCountdownAndTakePhoto = () => {
    setCountdown(3); // Start countdown from 3
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          triggerPhotoCapture();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const triggerPhotoCapture = () => {
    setIsFlashing(true);
    setTimeout(() => {
      takePhoto();
      setIsFlashing(false);
    }, 150);
  };

  const takePhoto = async () => {
    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    canvas.getContext('2d').drawImage(video, 0, 0);
    const photoUrl = canvas.toDataURL('image/jpeg');
    try {
      const response = await fetch('http://localhost:3001/process-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photo: photoUrl }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to process photo');
      }
      else {
        console.log(response);
      }
      const processedPhoto = await response.json();
      setPhoto(processedPhoto.url);
    } catch (error) {
      console.error('Error processing photo:', error);
      setPhoto(photoUrl); // Fallback to original photo if processing fails
    }
  };

  const retake = () => {
    setPhoto(null);
    setCountdown(null);
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto',
      height: '70vh',
      borderRadius: '20px',
      overflow: 'hidden',
      boxShadow: '0 12px 24px rgba(0, 0, 0, 0.2)',
      border: '3px solid rgba(255, 255, 255, 0.2)',
      background: 'linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
    }}>
      {/* Flash Effect */}
      {isFlashing && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'white',
          opacity: 0.7,
          zIndex: 10,
          animation: 'flash 0.15s ease-out',
        }} />
      )}

      {/* Countdown Display */}
      {countdown && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '120px',
          fontWeight: 'bold',
          color: 'white',
          textShadow: '0 0 20px rgba(0,0,0,0.5)',
          zIndex: 5,
          animation: 'pulse 1s infinite',
        }}>
          {countdown}
        </div>
      )}

      {/* Camera Frame Overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        border: '2px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '20px',
        pointerEvents: 'none',
        zIndex: 2,
      }}>
        {/* Corner Markers */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          width: '30px',
          height: '30px',
          borderLeft: '3px solid #2196F3',
          borderTop: '3px solid #2196F3',
        }} />
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          width: '30px',
          height: '30px',
          borderRight: '3px solid #2196F3',
          borderTop: '3px solid #2196F3',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          width: '30px',
          height: '30px',
          borderLeft: '3px solid #2196F3',
          borderBottom: '3px solid #2196F3',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          width: '30px',
          height: '30px',
          borderRight: '3px solid #2196F3',
          borderBottom: '3px solid #2196F3',
        }} />
      </div>

      <video 
        ref={videoRef} 
        autoPlay 
        playsInline
        style={{ 
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)', // Mirror effect
        }}
      />
      
      {photo && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: '#000',
          transition: 'all 0.3s ease',
        }}>
          <img 
            src={photo} 
            alt="Captured photo" 
            style={{ 
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)', // Mirror effect
            }}
          />
        </div>
      )}

      {/* Camera Controls */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '20px',
        zIndex: 3,
      }}>
        {!photo ? (
          <button 
            onClick={startCountdownAndTakePhoto}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            disabled={countdown !== null}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: countdown !== null ? 'rgba(200, 200, 200, 0.9)' : 'rgba(255, 255, 255, 0.9)',
              border: `3px solid ${countdown !== null ? '#999' : '#2196F3'}`,
              cursor: countdown !== null ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              transform: isHovering && countdown === null ? 'scale(1.1)' : 'scale(1)',
              boxShadow: isHovering && countdown === null
                ? '0 0 20px rgba(33, 150, 243, 0.5)' 
                : '0 4px 12px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: countdown !== null ? '#999' : '#2196F3',
              transition: 'all 0.3s ease',
              transform: isHovering && countdown === null ? 'scale(0.9)' : 'scale(1)',
            }} />
          </button>
        ) : (
          <button 
            onClick={retake}
            style={{
              padding: '12px 24px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '25px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            }}
          >
            Retake
          </button>
        )}
      </div>
    </div>
  );
}

// Add these styles to your CSS
const styles = `
  @keyframes flash {
    from { opacity: 0.7; }
    to { opacity: 0; }
  }

  @keyframes pulse {
    0% { transform: translate(-50%, -50%) scale(1); }
    50% { transform: translate(-50%, -50%) scale(1.1); }
    100% { transform: translate(-50%, -50%) scale(1); }
  }
`;

// Add styles to document
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.appendChild(document.createTextNode(styles));
document.head.appendChild(styleSheet);

export default CameraApp;
