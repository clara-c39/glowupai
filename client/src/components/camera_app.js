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
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState(null);
  const [faceDetection, setFaceDetection] = useState(null);
  const canvasRef = useRef(null);
  const [selectedGlasses, setSelectedGlasses] = useState(null);
  const [error, setError] = useState(null);
  const [originalImage, setOriginalImage] = useState(null);  

  const glassesImages = {
    round: '/glasses-images/round.png',
    oval: '/glasses-images/oval.png',
    square: '/glasses-images/square.png',
    rectangle: '/glasses-images/rectangle.png',
    'cat-eye': '/glasses-images/cat-eye.png',
    aviators: '/glasses-images/aviators.png',
    geometric: '/glasses-images/geometric.png',
    browline: '/glasses-images/browline.png'
  };

  useEffect(() => {
    startCamera();
    loadModels();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const loadModels = async () => {
    try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');      
        console.log('Models loaded successfully');
        setIsLoading(true);
    } catch (error) {
        console.error('Error loading models:', error);
        setIsLoading(false);
    }
  };

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
        // First get face color
        const color = await getFaceColor(photoUrl);
        
        // Process color with server
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
        
        // Set palette based on season
        if (processedColour.message.toLowerCase().includes("autumn")) {
            setPalette("/Autumn.png");
        } else if (processedColour.message.toLowerCase().includes("spring")) {
            setPalette("/Spring.png");
        } else if (processedColour.message.toLowerCase().includes("summer")) {
            setPalette("/Summer.png");
        } else if (processedColour.message.toLowerCase().includes("winter")) {
            setPalette("/Winter.png");
        }

        // Only after color processing is complete, proceed with glasses analysis
        const glassesPhoto = await generateGlassPhoto(photoUrl);
        setPhoto(glassesPhoto);

    } catch (error) {
        console.error('Error in photo processing:', error);
        setError(error.message);
    }
  };

  const retake = () => {
    setPhoto(null);
    setCountdown(null);
  };

  async function getFaceColor(imagePath) {
    // Create canvas with willReadFrequently attribute
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.setAttribute('willReadFrequently', 'true');
    
    // Load the image
    const img = await faceapi.createCanvasFromMedia(await faceapi.fetchImage(imagePath));
    
    // Detect face
    const detections = await faceapi.detectSingleFace(img)
        .withFaceLandmarks();
    
    if (!detections) {
        throw new Error('No face detected');
    }

    // Create canvas and draw image
    sampleCanvas.width = img.width;
    sampleCanvas.height = img.height;
    const ctx = sampleCanvas.getContext('2d');
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

  const analyzeFaceShape = (landmarks) => {
    const points = landmarks.positions;
    
    // Get key facial points
    const chin = points[8];  // Bottom of chin
    const leftJaw = points[4];  // Left jaw angle
    const rightJaw = points[12]; // Right jaw angle
    const leftCheek = points[2];  // Left cheekbone
    const rightCheek = points[14]; // Right cheekbone
    const foreheadCenter = points[24]; // Center of forehead
    const leftForehead = points[19];  // Left forehead
    const rightForehead = points[24]; // Right forehead
    
    // Calculate key measurements
    const faceLength = Math.abs(foreheadCenter.y - chin.y);
    const jawWidth = Math.abs(rightJaw.x - leftJaw.x);
    const cheekboneWidth = Math.abs(rightCheek.x - leftCheek.x);
    const foreheadWidth = Math.abs(rightForehead.x - leftForehead.x);
    
    // Calculate ratios
    const lengthToWidthRatio = faceLength / cheekboneWidth;
    const jawToCheekRatio = jawWidth / cheekboneWidth;
    const foreheadToJawRatio = foreheadWidth / jawWidth;

    // Add more detailed logging
    console.log('Face Shape Analysis:', {
        measurements: {
            faceLength: faceLength.toFixed(2),
            jawWidth: jawWidth.toFixed(2),
            cheekboneWidth: cheekboneWidth.toFixed(2),
            foreheadWidth: foreheadWidth.toFixed(2)
        },
        ratios: {
            lengthToWidth: lengthToWidthRatio.toFixed(2),
            jawToCheek: jawToCheekRatio.toFixed(2),
            foreheadToJaw: foreheadToJawRatio.toFixed(2)
        }
    });

    // Relaxed conditions for each face shape
    
    // Oblong detection
    if (lengthToWidthRatio > 1.1) {
        console.log('Detected: Oblong - Long face with balanced proportions');
        return 'oblong';
    }
    
    // Round - simplified criteria
     if (lengthToWidthRatio < 1 && cheekboneWidth >= jawWidth) {
        console.log('Detected: Round - Similar proportions');
        return 'round';
    }

    // Diamond detection - relaxed conditions
     if (cheekboneWidth > jawWidth) {
        console.log('Detected: Diamond - Wider cheekbones than jaw');
        return 'diamond';
    }

    // Square detection - relaxed conditions
    if (jawToCheekRatio > 0.8) {
        console.log('Detected: Square - Strong jaw, similar widths');
        return 'square';
    }
    
    // // Simplified fallback logic
    // if (lengthToWidthRatio > 1.3) {
    //     return 'oblong';
    // } else if (jawToCheekRatio > 0.85) {
    //     return 'square';
    // } else if (cheekboneWidth > jawWidth) {
    //     return 'diamond';
    // }
    
    // return 'round';
  };  

  const generateGlassPhoto = async (image) => {
    if (!image) {
        console.error('No image provided to generateGlassPhoto');
        return null;
    }

    // Create a temporary canvas if canvasRef is not available
    const tempCanvas = document.createElement('canvas');
    tempCanvas.setAttribute('willReadFrequently', 'true');
    const canvas = canvasRef.current || tempCanvas;
    const ctx = canvas.getContext('2d');

    try {
        // Create and load image properly
        const imgElement = new Image();
        imgElement.src = image;
        await new Promise((resolve, reject) => {
            imgElement.onload = resolve;
            imgElement.onerror = reject;
        });
        
        // Create canvas with loaded image
        const img = await faceapi.createCanvasFromMedia(imgElement);
        
        // Detect face
        const detection = await faceapi
            .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks();

        if (!detection) {
            throw new Error('No face detected in the image');
        }

        // Store the detection results
        setFaceDetection(detection);

        // Analyze face shape and get recommendations
        const faceShape = analyzeFaceShape(detection.landmarks);
        console.log('Detected face shape:', faceShape);

        const recommendations = getGlassesRecommendations(faceShape);
        console.log('Glasses recommendations:', recommendations);
        
        // Set the first recommended glasses style
        const firstRecommendedStyle = recommendations[0];
        setSelectedGlasses(glassesImages[firstRecommendedStyle]);

        // Create and store the original image
        const displayImage = new Image();
        displayImage.src = image;
        await new Promise((resolve, reject) => {
            displayImage.onload = resolve;
            displayImage.onerror = reject;
        });
        
        setOriginalImage(displayImage);
        
        if (!canvasRef.current) {
            throw new Error('Canvas reference is not available');
        }
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Set canvas size and draw image
        canvas.width = displayImage.width;
        canvas.height = displayImage.height;
        ctx.drawImage(displayImage, 0, 0, canvas.width, canvas.height);
        
        // Load and draw glasses
        const glassesImg = new Image();
        glassesImg.src = glassesImages[firstRecommendedStyle];
        await glassesImg.decode();
        
        const position = calculateGlassesPosition(detection.landmarks, glassesImg, canvas);
        drawGlassesOnCanvas(ctx, glassesImg, position, displayImage);

        // Set results
        setResults({
            faceShape,
            recommendedGlasses: recommendations
        });

        // Return the final canvas image
        return canvas.toDataURL();

    } catch (error) {
        console.error('Error in generateGlassPhoto:', error);
        setError(error.message);
        return null;
    }
  };

  const getGlassesRecommendations = (faceShape) => {
    const recommendations = {
        round: ['square', 'rectangle', 'geometric'],
        square: ['round', 'aviators', 'browline'],
        diamond: ['oval', 'browline', 'cat-eye'],
        oblong: ['round', 'square', 'geometric']
    };

    return recommendations[faceShape];
  };

  const getFaceShapeDescription = (shape) => {
    const descriptions = {
        round: "Soft, curved features with similar face width and length.",
        square: "Strong jawline with nearly equal width from forehead to jaw.",
        diamond: "Narrow forehead and jawline with prominent cheekbones.",
        oblong: "Face length is notably longer than its width, with balanced proportions."  // Added oblong description
    };
    return descriptions[shape] || "Unique face shape with its own distinctive features.";
  };

  const handleGlassesChange = (style) => {
    if (!faceDetection || !originalImage) {
        console.error('No face detection data or original image available');
        return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Load new glasses image
    const glassesImg = new Image();
    glassesImg.onload = () => {
        // Calculate position for new glasses
        const position = calculateGlassesPosition(faceDetection.landmarks, glassesImg, canvas);
        
        // Draw new glasses
        drawGlassesOnCanvas(ctx, glassesImg, position, originalImage);
        
        // Update selected glasses state
        setSelectedGlasses(glassesImages[style]);
    };
    glassesImg.src = glassesImages[style];
  };  

  const calculateGlassesPosition = (landmarks, glassesImg, canvas) => {
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    
    // Get eye corners for width calculation
    const leftOuterCorner = leftEye[0];
    const leftInnerCorner = leftEye[3];
    const rightInnerCorner = rightEye[0];
    const rightOuterCorner = rightEye[3];
    
    // Calculate eye dimensions
    const eyeSpan = Math.abs(rightOuterCorner.x - leftOuterCorner.x);
    
    // Calculate eye centers
    const leftEyeCenter = {
        x: (leftInnerCorner.x + leftOuterCorner.x) / 2,
        y: leftEye.reduce((sum, p) => sum + p.y, 0) / leftEye.length
    };
    
    const rightEyeCenter = {
        x: (rightInnerCorner.x + rightOuterCorner.x) / 2,
        y: rightEye.reduce((sum, p) => sum + p.y, 0) / rightEye.length
    };

    // Get original glasses aspect ratio
    const glassesAspectRatio = glassesImg.width / glassesImg.height;
    
    // Set glasses width based on eye span
    const glassesWidth = eyeSpan * 2.2; // Adjust multiplier as needed
    
    // Calculate height while maintaining aspect ratio
    const glassesHeight = glassesWidth / glassesAspectRatio;
    
    // Calculate center position between eyes
    const centerX = (leftEyeCenter.x + rightEyeCenter.x) / 2;
    const centerY = (leftEyeCenter.y + rightEyeCenter.y) / 2;

    // Position glasses
    const glassesX = centerX - (glassesWidth / 2);
    const glassesY = centerY - (glassesHeight / 2);

    // Calculate angle between eyes
    const angle = Math.atan2(
        rightEyeCenter.y - leftEyeCenter.y,
        rightEyeCenter.x - leftEyeCenter.x
    );

    return {
        x: glassesX,
        y: glassesY,
        width: glassesWidth,
        height: glassesHeight,
        angle: angle * (180 / Math.PI),
        scale: 1.0 // Remove dynamic scaling
    };
  };

  const drawGlassesOnCanvas = (ctx, glassesImg, position, originalImage) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(originalImage, 0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.save();

    const centerX = position.x + position.width/2;
    const centerY = position.y + position.height/2;

    ctx.translate(centerX, centerY);
    ctx.rotate(position.angle * Math.PI / 180);

    // Remove scaling transformation
    ctx.drawImage(
        glassesImg,
        -position.width/2,
        -position.height/2,
        position.width,
        position.height
    );

    ctx.restore();
  };

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
      {/* Add hidden canvas for glasses overlay */}
      <canvas 
        ref={canvasRef}
        style={{ display: 'none' }}
        willReadFrequently={true}  // Add this attribute
      />
      
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
