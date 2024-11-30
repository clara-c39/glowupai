import React, { useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';

function Glasses() {
    const [isLoading, setIsLoading] = useState(true);
    const [results, setResults] = useState(null);

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

    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            // Create an image element
            const img = await faceapi.bufferToImage(file);
            
            // Display the uploaded image
            const displayImage = document.createElement('img');
            displayImage.src = URL.createObjectURL(file);
            displayImage.style.maxWidth = '400px';
            const container = document.getElementById('imageContainer');
            container.innerHTML = '';
            container.appendChild(displayImage);

            // Detect face landmarks
            const detection = await faceapi
                .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks();

            if (!detection) {
                throw new Error('No face detected in the image');
            }

            // Analyze face shape based on landmarks
            const faceShape = analyzeFaceShape(detection.landmarks);
            
            // Get glasses recommendations
            const recommendations = getGlassesRecommendations(faceShape);
            
            // Set results
            setResults({
                faceShape: faceShape,
                recommendations: recommendations
            });

        } catch (error) {
            console.error('Error processing image:', error);
            alert(error.message);
        }
    };

    const analyzeFaceShape = (landmarks) => {
        const points = landmarks.positions;
        
        // Calculate key measurements
        const faceHeight = points[8].y - points[27].y;  // Chin to forehead
        const faceWidth = points[16].x - points[0].x;   // Ear to ear
        const jawWidth = points[12].x - points[4].x;    // Jaw width
        const foreheadWidth = points[26].x - points[17].x;  // Forehead width
        const cheekboneWidth = points[15].x - points[1].x;  // Cheekbone width
        
        // Calculate ratios
        const aspectRatio = faceHeight / faceWidth;
        const jawRatio = jawWidth / faceWidth;
        const foreheadRatio = foreheadWidth / faceWidth;
        const cheekboneRatio = cheekboneWidth / faceWidth;
        
        console.log('Face Measurements:', {
            aspectRatio,
            jawRatio,
            foreheadRatio,
            cheekboneRatio,
            jawWidth,
            cheekboneWidth,
            foreheadWidth
        });

        // Round face: width and height similar, soft angles
        if (aspectRatio <= 1.3 && 
            Math.abs(faceWidth - faceHeight) < 20 &&
            Math.abs(jawWidth - cheekboneWidth) < 10) {
            return 'round';
        }
        
        // Oblong face: significantly longer than wide
        if (aspectRatio >= 1.75) {
            return 'oblong';
        }

        // Heart face: wide forehead, narrow chin
        if (foreheadWidth > cheekboneWidth + 15 && 
            foreheadWidth > jawWidth + 25 && 
            aspectRatio > 1.3) {
            return 'heart';
        }

        // Square face: similar measurements, strong jaw
        if (Math.abs(jawWidth - cheekboneWidth) < 20 && 
            Math.abs(jawWidth - foreheadWidth) < 20 && 
            aspectRatio < 1.4) {
            return 'square';
        }

        // Diamond face: prominent cheekbones
        if (cheekboneWidth > jawWidth + 25 && 
            cheekboneWidth > foreheadWidth + 25 && 
            aspectRatio > 1.3) {
            return 'diamond';
        }

        // Oval face: balanced proportions with slightly wider cheekbones
        if (cheekboneWidth > jawWidth + 10 && 
            cheekboneWidth > foreheadWidth && 
            aspectRatio >= 1.3 && 
            aspectRatio < 1.7) {
            return 'oval';
        }

        // Fallback logic based on strongest characteristic
        const widestPart = Math.max(jawWidth, cheekboneWidth, foreheadWidth);
        const narrowestPart = Math.min(jawWidth, cheekboneWidth, foreheadWidth);
        const difference = widestPart - narrowestPart;

        if (difference > 30) {
            if (foreheadWidth === widestPart) return 'heart';
            if (cheekboneWidth === widestPart) return 'diamond';
            if (jawWidth === widestPart) return 'square';
        }

        // If the face is longer than it is wide but measurements are similar
        if (aspectRatio > 1.4) {
            return 'oval';
        }

        // Default case
        return 'oval';
    };

    const getGlassesRecommendations = (faceShape) => {
        const recommendations = {
            round: [
                'rectangle',
                'geometric',
                'browline'
            ],
            oval: [
                'round',
                'aviators',
                'cat-eye',
                'rectangle'
            ],
            square: [
                'round',
                'oval',
                'cat-eye'
            ],
            heart: [
                'cat-eye',
                'oval',
                'rectangle'
            ],
            diamond: [
                'browline',
                'cat-eye',
                'oval'
            ],
            oblong: [
                'geometric',
                'round',
                'aviators'
            ]
        };

        return recommendations[faceShape] || ['oval', 'rectangle'];
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>
                Face Shape & Glasses Analyzer
            </h1>

            {isLoading ? (
                <div style={{ textAlign: 'center', color: 'blue' }}>
                    Loading face detection models...
                </div>
            ) : (
                <div>
                    <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            style={{ marginBottom: '20px' }}
                        />
                    </div>

                    <div 
                        id="imageContainer" 
                        style={{ 
                            textAlign: 'center',
                            marginBottom: '20px'
                        }}
                    />

                    {results && (
                        <div style={{
                            marginTop: '20px',
                            padding: '20px',
                            border: '1px solid #ccc',
                            borderRadius: '8px',
                            backgroundColor: '#f9f9f9'
                        }}>
                            <h2 style={{ marginBottom: '15px' }}>Analysis Results</h2>
                            <p><strong>Your Face Shape:</strong> {results.faceShape}</p>
                            <p><strong>Recommended Glasses Styles:</strong></p>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {results.recommendations.map((style, index) => (
                                    <li 
                                        key={index}
                                        style={{
                                            padding: '8px',
                                            margin: '5px 0',
                                            backgroundColor: 'white',
                                            borderRadius: '4px',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                        }}
                                    >
                                        {style}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default Glasses;