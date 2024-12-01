import React, { useEffect, useState, useRef } from 'react';
import * as faceapi from 'face-api.js';

function Glasses() {
    const [isLoading, setIsLoading] = useState(true);
    const [results, setResults] = useState(null);
    const canvasRef = useRef(null);
    const [selectedGlasses, setSelectedGlasses] = useState(null);
    const [faceDetection, setFaceDetection] = useState(null);
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
        loadModels();
    }, []);

    const loadModels = async () => {
        try {
            await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
            await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
            console.log('Models loaded successfully');
            setIsLoading(false);
        } catch (error) {
            console.error('Error loading models:', error);
            setIsLoading(false);
        }
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

    // Add a utility function to handle image loading
    const loadImage = (src) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    };

    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const img = await faceapi.bufferToImage(file);
            
            // Detect face
            const detection = await faceapi
                .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks();

            if (!detection) {
                throw new Error('No face detected in the image');
            }

            // Store the detection results
            setFaceDetection(detection);

            const faceShape = analyzeFaceShape(detection.landmarks);
            const recommendations = getGlassesRecommendations(faceShape);
            
            // Set the first recommended glasses style
            const firstRecommendedStyle = recommendations[0];
            setSelectedGlasses(glassesImages[firstRecommendedStyle]);

            // Create and store the original image
            const displayImage = new Image();
            displayImage.src = URL.createObjectURL(file);
            displayImage.onload = () => {
                setOriginalImage(displayImage);
                
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                
                // Set canvas size to match image
                canvas.width = displayImage.width;
                canvas.height = displayImage.height;
                
                // Draw the original image
                ctx.drawImage(displayImage, 0, 0, canvas.width, canvas.height);
                
                // Load and draw initial glasses
                const glassesImg = new Image();
                glassesImg.src = glassesImages[firstRecommendedStyle];
                
                glassesImg.onload = () => {
                    const position = calculateGlassesPosition(detection.landmarks, glassesImg, canvas);
                    drawGlassesOnCanvas(ctx, glassesImg, position, displayImage);
                };
            };
            
            setResults({
                faceShape,
                recommendedGlasses: recommendations
            });

        } catch (error) {
            console.error('Error processing image:', error);
            alert(error.message);
        }
    };

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

    const getGlassesRecommendations = (faceShape) => {
        const recommendations = {
            round: ['square', 'rectangle', 'geometric'],
            square: ['round', 'aviators', 'browline'],
            diamond: ['oval', 'browline', 'cat-eye'],
            oblong: ['round', 'square', 'geometric']
        };

        return recommendations[faceShape];
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

    // Update face shape descriptions
    const getFaceShapeDescription = (shape) => {
        const descriptions = {
            round: "Soft, curved features with similar face width and length.",
            square: "Strong jawline with nearly equal width from forehead to jaw.",
            diamond: "Narrow forehead and jawline with prominent cheekbones.",
            oblong: "Face length is notably longer than its width, with balanced proportions."  // Added oblong description
        };
        return descriptions[shape] || "Unique face shape with its own distinctive features.";
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1>Face Shape & Glasses Analyzer</h1>
            
            <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ marginBottom: '20px' }}
            />
            
            <div style={{ marginTop: '20px' }}>
                <canvas 
                    ref={canvasRef}
                    style={{
                        maxWidth: '100%',
                        display: 'block',
                        margin: '0 auto'
                    }}
                />
                
                {results && (
                    <div style={{ marginTop: '20px' }}>
                        <div style={{ 
                            padding: '15px',
                            backgroundColor: '#f5f5f5',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            <p style={{ margin: '0', fontSize: '0.9em', color: '#666' }}>
                                {getFaceShapeDescription(results.faceShape)}
                            </p>
                        </div>
                        
                        <h4>Recommended Glasses Styles:</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {results.recommendedGlasses.map((style) => (
                                <button
                                    key={style}
                                    onClick={() => handleGlassesChange(style)}
                                    style={{
                                        padding: '8px 16px',
                                        border: selectedGlasses === glassesImages[style] 
                                            ? '2px solid blue' 
                                            : '1px solid gray',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        backgroundColor: selectedGlasses === glassesImages[style]
                                            ? '#e6e6ff'
                                            : 'white'
                                    }}
                                >
                                    {style}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Glasses;