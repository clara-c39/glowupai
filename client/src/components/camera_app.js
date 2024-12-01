import React, { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';

function CameraApp() {
  const videoRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [message, setMessage] = useState(null); 
  const [palette, setPalette] = useState(null); 

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
    setPhoto(photoUrl);
    const color = await getFaceColor(photoUrl);
    console.log(color);
    try {
      const response = await fetch('http://localhost:3001/process-colour', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ colour: color }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to process colour');
      }
      

      const processedColour = await response.json();
      setMessage(processedColour.message);
      if (processedColour.message.toLowerCase().includes("autumn")) {
        setPalette("/Autumn.png");
      }
      else if (processedColour.message.toLowerCase().includes("spring")) {
        setPalette("/Spring.png");
      }
      else if (processedColour.message.toLowerCase().includes("summer")) {
        setPalette("/Summer.png");
      }
      else if (processedColour.message.toLowerCase().includes("winter")) {
        setPalette("/Winter.png");
      }

    } catch (error) {
      console.error('Error processing colour:', error);
    }
  };

  const retake = () => {
    setPhoto(null);
    setCountdown(null);
  };

  async function getFaceColor(imagePath) {
    // Load the models
    await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');

    // Load the image
    const img = await faceapi.createCanvasFromMedia(await faceapi.fetchImage(imagePath));
    
    // Detect face
    const detections = await faceapi.detectSingleFace(img)
        .withFaceLandmarks();
    
    if (!detections) {
        throw new Error('No face detected');
    }

    // Create canvas and draw image
    const cvs = document.createElement('canvas');
    cvs.width = img.width;
    cvs.height = img.height;
    const ctx = cvs.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // Get face bounds
    const { _box: box } = detections.detection;
    
    // Sample multiple points on the face to get average color
    const samplePoints = 10;
    let r = 0, g = 0, b = 0;
    
    for (let i = 0; i < samplePoints; i++) {
        const x = box.x + (box.width * (i / samplePoints));
        const y = box.y + (box.height / 2);
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        r += pixel[0];
        g += pixel[1];
        b += pixel[2];
    }
    
    // Calculate average color
    const avgColor = {
        r: Math.round(r / samplePoints),
        g: Math.round(g / samplePoints),
        b: Math.round(b / samplePoints)
    };
    
    return avgColor;
}

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: '1200px',
      margin: '0 auto',
      height: '70vh',
      display: 'flex',
      borderRadius: '20px',
      overflow: 'hidden',
      boxShadow: '0 12px 24px rgba(0, 0, 0, 0.2)',
      border: '3px solid rgba(255, 255, 255, 0.2)',
      background: 'linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
    }}>
      {/* Left Column - Message */}
      <div style={{
        flex: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        {message && (
          <div style={{
            padding: '15px 25px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            borderRadius: '20px',
            maxWidth: '250px',
            wordWrap: 'break-word',
          }}>
            {message}
          </div>
        )}
      </div>

      {/* Middle Column - Video */}
      <div style={{
        flex: '2',
        position: 'relative',
        borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
        borderRight: '1px solid rgba(255, 255, 255, 0.2)',
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

        {/* Show either video or photo */}
        {!photo ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline
            style={{ 
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)',
            }}
          />
        ) : (
          <img 
            src={photo}
            alt="Captured photo"
            style={{ 
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)',
            }}
          />
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
            <button onClick={retake} style={{
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
            }}>
              Retake
            </button>
          )}
        </div>
      </div>

      {/* Right Column - Palette Display */}
      <div style={{
        flex: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        {palette && (
          <img 
            src={palette}
            alt="Color Palette"
            style={{
              maxWidth: '100%',
              maxHeight: '80%',
              objectFit: 'contain',
              borderRadius: '10px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            }}
          />
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
