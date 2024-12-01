import React, { useEffect, useState, useRef } from 'react';
import * as faceapi from 'face-api.js';
import './css/Makeup.css';

function Makeup() {
  const [image, setImage] = useState(null);
  const [faceData, setFaceData] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef();
  const canvasRef = useRef();

  // Load models on component mount
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]);
        setModelsLoaded(true);
        console.log('Models loaded successfully');
      } catch (error) {
        console.error('Error loading models:', error);
      }
    };

    loadModels();
  }, []);

  // Add these helper functions at the top of your component
  const analyzeFaceShape = (landmarks) => {
    // Basic face shape analysis based on landmark positions
    const jaw = landmarks.positions.slice(0, 17);
    const jawWidth = Math.abs(jaw[16].x - jaw[0].x);
    const jawHeight = Math.abs(jaw[8].y - landmarks.positions[27].y);
    const ratio = jawWidth / jawHeight;

    if (ratio > 1.1) return "Round or Square";
    if (ratio < 0.9) return "Oval or Oblong";
    return "Heart or Diamond";
  };

  const analyzeSkinTone = async (img, detection) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    // Sample color from cheek area
    const cheekPoint = detection.landmarks.positions[1]; // Right cheek point
    const imageData = ctx.getImageData(cheekPoint.x, cheekPoint.y, 1, 1).data;
    const [r, g, b] = imageData;
    
    // Very basic warm/cool tone detection
    return (r > b) ? "Warm" : "Cool";
  };

  // Update your handleImageLoad function
  const handleImageLoad = async () => {
    if (!modelsLoaded) {
      console.log('Models not loaded yet');
      return;
    }

    console.log('Starting face detection...');
    const img = imageRef.current;
    const canvas = canvasRef.current;
    
    // Get the displayed image dimensions
    const displaySize = {
      width: img.offsetWidth,
      height: img.offsetHeight
    };
    
    // Match canvas size to displayed image size
    canvas.width = displaySize.width;
    canvas.height = displaySize.height;

    try {
      const detections = await faceapi.detectAllFaces(
        img,
        new faceapi.TinyFaceDetectorOptions()
      )
      .withFaceLandmarks()
      .withFaceExpressions();

      console.log('Detections:', detections);

      // Clear the canvas
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Resize detections to match display size
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      
      // Draw landmarks
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

      if (detections.length > 0) {
        const detection = detections[0];
        const faceShape = analyzeFaceShape(detection.landmarks);
        const skinTone = await analyzeSkinTone(img, detection);
        
        setFaceData({
          ...detection,
          analysis: {
            faceShape,
            skinTone,
            recommendations: generateRecommendations(faceShape, skinTone)
          }
        });

        console.log('Face analyzed:', faceShape, skinTone);
      }
    } catch (error) {
      console.error('Error during face detection:', error);
    }
  };

  const generateRecommendations = (faceShape, skinTone) => {
    const recommendations = {
      blush: {},
      eyeshadow: {},
      lipstick: {},
      general: []
    };

    // Face shape based recommendations
    switch(faceShape) {
      case "Round or Square":
        recommendations.general.push(
          "Use contouring to create the illusion of length",
          "Apply blush at an angle towards temples"
        );
        break;
      case "Oval or Oblong":
        recommendations.general.push(
          "Focus on horizontal makeup techniques",
          "Apply blush horizontally across cheeks"
        );
        break;
      default:
        recommendations.general.push(
          "Highlight cheekbones",
          "Soften angular features with rounded application"
        );
    }

    // Skin tone based recommendations
    if (skinTone === "Warm") {
      recommendations.blush.colors = ["Peach", "Coral", "Orange-based pinks"];
      recommendations.eyeshadow.colors = ["Gold", "Bronze", "Copper"];
      recommendations.lipstick.colors = ["Warm red", "Coral", "Terra cotta"];
    } else {
      recommendations.blush.colors = ["Rose", "Pink", "Plum"];
      recommendations.eyeshadow.colors = ["Silver", "Taupe", "Cool brown"];
      recommendations.lipstick.colors = ["Blue-based red", "Berry", "Mauve"];
    }

    return recommendations;
  };

  // Add a useEffect to process image when both models and image are ready
  useEffect(() => {
    if (modelsLoaded && imageLoaded && imageRef.current) {
      console.log('Both models and image are loaded, processing...');
      handleImageLoad();
    }
  }, [modelsLoaded, imageLoaded]);

  // Modify the image onLoad handler
  const handleInitialImageLoad = () => {
    console.log('Image loaded');
    setImageLoaded(true);
  };

  // Add function to handle file upload
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target.result);
        setImageLoaded(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Update your return statement to show recommendations
  return (
    <div className="makeup-container">
      <div className="image-container">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="image-upload"
        />
        {image && (
          <>
            <img 
              ref={imageRef}
              src={image}
              alt="Uploaded face"
              id="inputImage"
              onLoad={handleInitialImageLoad}
            />
            <canvas ref={canvasRef} />
          </>
        )}
      </div>
      
      <div className="recommendations-container">
        {faceData?.analysis && (
          <div>
            <h2>Your Analysis Results:</h2>
            <p>Face Shape: {faceData.analysis.faceShape}</p>
            <p>Skin Tone: {faceData.analysis.skinTone}</p>
            
            <h3>Recommendations:</h3>
            <h4>General Tips:</h4>
            <ul>
              {faceData.analysis.recommendations.general.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
            
            <h4>Color Recommendations:</h4>
            <p>Blush: {faceData.analysis.recommendations.blush.colors.join(', ')}</p>
            <p>Eyeshadow: {faceData.analysis.recommendations.eyeshadow.colors.join(', ')}</p>
            <p>Lipstick: {faceData.analysis.recommendations.lipstick.colors.join(', ')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Makeup;
