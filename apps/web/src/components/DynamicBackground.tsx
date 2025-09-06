'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';

interface DynamicBackgroundProps {
  intensity?: 'low' | 'med' | 'high';
  showParticles?: boolean;
  className?: string;
}

interface FloatingElement {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  hue: number;
  type: 'bubble' | 'ray' | 'sparkle' | 'orb';
  rotation: number;
  rotationSpeed: number;
}

export function DynamicBackground({ 
  intensity = 'med', 
  showParticles = true,
  className = ''
}: DynamicBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const elementsRef = useRef<FloatingElement[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const lastTimeRef = useRef(0);
  const [isVisible, setIsVisible] = useState(true);

  // Intensity settings
  const intensitySettings = {
    low: { elementCount: 20, speed: 0.2, opacity: 0.15 },
    med: { elementCount: 40, speed: 0.3, opacity: 0.25 },
    high: { elementCount: 60, speed: 0.4, opacity: 0.35 }
  };

  const settings = intensitySettings[intensity];

  // Initialize floating elements
  const initElements = useCallback(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const elements: FloatingElement[] = [];
    
    for (let i = 0; i < settings.elementCount; i++) {
      const type = ['bubble', 'ray', 'sparkle', 'orb'][Math.floor(Math.random() * 4)] as FloatingElement['type'];
      
      elements.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * settings.speed * 2,
        vy: (Math.random() - 0.5) * settings.speed * 2,
        size: Math.random() * 4 + 1,
        opacity: Math.random() * settings.opacity + 0.05,
        hue: Math.random() * 20 + 0, // Dark gray range
        type,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02
      });
    }
    
    elementsRef.current = elements;
  }, [settings]);

  // Update floating elements
  const updateElements = useCallback((deltaTime: number) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const elements = elementsRef.current;
    const mouse = mouseRef.current;
    
    elements.forEach(element => {
      // Gentle floating motion
      element.vx += (Math.random() - 0.5) * 0.05;
      element.vy += (Math.random() - 0.5) * 0.05;
      
      // Mouse attraction (subtle)
      const mouseInfluence = 0.0002;
      const dx = mouse.x - element.x;
      const dy = mouse.y - element.y;
      element.vx += dx * mouseInfluence;
      element.vy += dy * mouseInfluence;
      
      // Update position
      element.x += element.vx * deltaTime;
      element.y += element.vy * deltaTime;
      
      // Update rotation
      element.rotation += element.rotationSpeed * deltaTime;
      
      // Wrap around screen
      if (element.x < -50) element.x = canvas.width + 50;
      if (element.x > canvas.width + 50) element.x = -50;
      if (element.y < -50) element.y = canvas.height + 50;
      if (element.y > canvas.height + 50) element.y = -50;
      
      // Dampen velocity
      element.vx *= 0.998;
      element.vy *= 0.998;
      
      // Hue drift
      element.hue += 0.2;
      if (element.hue > 260) element.hue = 200;
    });
  }, []);

  // Render floating elements
  const renderElements = useCallback(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    elementsRef.current.forEach(element => {
      ctx.save();
      ctx.globalAlpha = element.opacity;
      ctx.translate(element.x, element.y);
      ctx.rotate(element.rotation);
      
      switch (element.type) {
        case 'bubble':
          // Draw bubble with gradient
          const bubbleGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, element.size);
          bubbleGradient.addColorStop(0, `hsla(${element.hue}, 10%, 20%, 0.3)`);
          bubbleGradient.addColorStop(0.7, `hsla(${element.hue}, 10%, 15%, 0.15)`);
          bubbleGradient.addColorStop(1, `hsla(${element.hue}, 10%, 10%, 0.05)`);
          
          ctx.fillStyle = bubbleGradient;
          ctx.beginPath();
          ctx.arc(0, 0, element.size, 0, Math.PI * 2);
          ctx.fill();
          
          // Bubble highlight
          ctx.fillStyle = `hsla(${element.hue}, 10%, 25%, 0.2)`;
          ctx.beginPath();
          ctx.arc(-element.size * 0.3, -element.size * 0.3, element.size * 0.3, 0, Math.PI * 2);
          ctx.fill();
          break;
          
        case 'ray':
          // Draw ray/beam
          const rayGradient = ctx.createLinearGradient(-element.size, 0, element.size, 0);
          rayGradient.addColorStop(0, `hsla(${element.hue}, 10%, 15%, 0)`);
          rayGradient.addColorStop(0.5, `hsla(${element.hue}, 10%, 20%, 0.2)`);
          rayGradient.addColorStop(1, `hsla(${element.hue}, 10%, 15%, 0)`);
          
          ctx.fillStyle = rayGradient;
          ctx.fillRect(-element.size, -element.size * 0.1, element.size * 2, element.size * 0.2);
          break;
          
        case 'sparkle':
          // Draw sparkle/star
          ctx.strokeStyle = `hsla(${element.hue}, 10%, 25%, 0.3)`;
          ctx.lineWidth = 1;
          
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(0, -element.size);
            ctx.lineTo(0, element.size);
            ctx.moveTo(-element.size, 0);
            ctx.lineTo(element.size, 0);
            ctx.stroke();
            ctx.rotate(Math.PI / 4);
          }
          
          // Center dot
          ctx.fillStyle = `hsla(${element.hue}, 10%, 30%, 0.4)`;
          ctx.beginPath();
          ctx.arc(0, 0, element.size * 0.2, 0, Math.PI * 2);
          ctx.fill();
          break;
          
        case 'orb':
          // Draw orb with pulsing effect
          const orbGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, element.size);
          orbGradient.addColorStop(0, `hsla(${element.hue}, 10%, 20%, 0.4)`);
          orbGradient.addColorStop(0.5, `hsla(${element.hue}, 10%, 15%, 0.2)`);
          orbGradient.addColorStop(1, `hsla(${element.hue}, 10%, 10%, 0.05)`);
          
          ctx.fillStyle = orbGradient;
          ctx.beginPath();
          ctx.arc(0, 0, element.size, 0, Math.PI * 2);
          ctx.fill();
          
          // Orb glow
          ctx.shadowColor = `hsla(${element.hue}, 10%, 15%, 0.2)`;
          ctx.shadowBlur = element.size * 1;
          ctx.fillStyle = `hsla(${element.hue}, 10%, 25%, 0.15)`;
          ctx.beginPath();
          ctx.arc(0, 0, element.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          break;
      }
      
      ctx.restore();
    });
  }, []);

  // Animation loop with FPS cap
  const animate = useCallback((currentTime: number) => {
    if (!isVisible) return;
    
    const deltaTime = Math.min(currentTime - lastTimeRef.current, 1000 / 60); // Cap at 60 FPS
    lastTimeRef.current = currentTime;
    
    updateElements(deltaTime);
    renderElements();
    
    animationRef.current = requestAnimationFrame(animate);
  }, [isVisible, updateElements, renderElements]);

  // Handle mouse movement
  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  // Handle visibility change
  const handleVisibilityChange = useCallback(() => {
    setIsVisible(!document.hidden);
  }, []);

  // Setup canvas
  const setupCanvas = useCallback(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Initialize everything
  useEffect(() => {
    if (!showParticles) return;
    
    const cleanupCanvas = setupCanvas();
    initElements();
    
    // Start animation
    animationRef.current = requestAnimationFrame(animate);
    
    // Add event listeners
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cleanupCanvas?.();
    };
  }, [showParticles, setupCanvas, initElements, animate, handleMouseMove, handleVisibilityChange]);

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    return (
      <div className={`fixed inset-0 -z-10 ${className}`}>
        <div className="aurora-static aurora-intensity-low"></div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 -z-10 ${className}`}>
      {/* Animated Gradient Background */}
      <div className={`animated-gradient aurora-intensity-${intensity}`}></div>
      
      {/* Floating Elements Layer */}
      {showParticles && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ willChange: 'transform' }}
        />
      )}
      
      {/* Animated Lines/Rays */}
      <div className="animated-lines">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className={`animated-line line-${i + 1}`}></div>
        ))}
      </div>
    </div>
  );
}

// Utility function for cleanup
export const cleanupDynamicBackground = () => {
  // This would be called when unmounting or route changes
  // The useEffect cleanup handles most of this automatically
};
