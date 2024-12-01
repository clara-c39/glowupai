import React, { useEffect, useState } from 'react';

const ColorAnalysis = () => {
  const [image, setImage] = useState(null);

  useEffect(() => {
    const fetchImage = async () => {
      try {
        const response = await fetch('http://localhost:3001/color-analysis');
        if (response.ok) {
          const data = await response.json();
          setImage(data.imageSrc);
        }
      } catch (error) {
        console.error('Error fetching image:', error);
      }
    };

    fetchImage();
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px',
    }}>
      <h1>Your Photo</h1>
      {image ? (
        <img 
          src={image} 
          alt="Captured" 
          style={{
            maxWidth: '80%',
            maxHeight: '70vh',
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          }}
        />
      ) : (
        <div>Loading...</div>
      )}
    </div>
  );
};

export default ColorAnalysis;