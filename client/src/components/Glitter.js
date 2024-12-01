import React, { useEffect, useRef } from 'react';

const Glitter = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    // Glitter particle class
    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        // Spiral parameters
        this.angle = Math.random() * Math.PI * 2;
        this.radius = 150 + Math.random() * 100; // Spiral radius
        this.spiralAngle = this.angle;
        
        // Center position (middle of screen)
        this.x = canvas.width / 2 + Math.cos(this.spiralAngle) * this.radius;
        this.y = canvas.height / 2 + Math.sin(this.spiralAngle) * this.radius;
        
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 2 - 1;
        this.speedY = Math.random() * 2 - 1;
        this.sparkleSpeed = 0.02 + Math.random() * 0.03;
        this.opacity = Math.random();
        this.color = `hsl(${Math.random() * 60 + 180}, 100%, 75%)`; // Blue-ish sparkles
      }

      update() {
        // Update spiral position
        this.spiralAngle += 0.02;
        this.x = canvas.width / 2 + Math.cos(this.spiralAngle) * this.radius;
        this.y = canvas.height / 2 + Math.sin(this.spiralAngle) * this.radius;
        
        // Add some random movement
        this.x += this.speedX;
        this.y += this.speedY;
        
        // Sparkle effect
        this.opacity += Math.sin(Date.now() * this.sparkleSpeed) * 0.1;
        
        // Reset if particle goes off screen
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
          this.reset();
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = Math.abs(Math.sin(Date.now() * this.sparkleSpeed)) * 0.5;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Create particles
    const particles = Array.from({ length: 50 }, () => new Particle());

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });
      
      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', setCanvasSize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1
      }}
    />
  );
};

export default Glitter; 