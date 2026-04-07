'use client';

import { useEffect, useState } from 'react';

const loadingMessages = [
  'Initializing workspace...',
  'Connecting to agents...',
  'Loading your squads...',
  'Preparing dashboard...',
  'Almost there...',
];

interface OrkestriaLoaderProps {
  message?: string;
  showProgress?: boolean;
}

export function OrkestriaLoader({ message, showProgress = true }: OrkestriaLoaderProps) {
  const [currentMessage, setCurrentMessage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % loadingMessages.length);
    }, 2500);

    return () => clearInterval(messageInterval);
  }, []);

  useEffect(() => {
    if (!showProgress) return;
    
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 500);

    return () => clearInterval(progressInterval);
  }, [showProgress]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#030810] overflow-hidden">
      {/* Animated background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-violet-500/20 via-fuchsia-500/20 to-orange-500/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[80px] animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-orange-500/10 rounded-full blur-[60px] animate-float-slow-reverse" />
      </div>

      {/* Particle effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full animate-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo animation container */}
        <div className="relative w-40 h-40 mb-8">
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500/30 via-fuchsia-500/30 to-violet-500/30 blur-xl animate-pulse-glow" />
          
          {/* Rotating outer ring */}
          <div className="absolute inset-2 rounded-full border-2 border-violet-500/20 animate-spin-slow" />
          <div className="absolute inset-4 rounded-full border border-fuchsia-500/10 animate-spin-reverse" />
          
          {/* Main logo SVG animation */}
          <svg
            viewBox="0 0 200 200"
            className="absolute inset-0 w-full h-full"
          >
            {/* Definitions for gradients */}
            <defs>
              {/* Purple gradient for the C shape */}
              <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="50%" stopColor="#A855F7" />
                <stop offset="100%" stopColor="#D946EF" />
              </linearGradient>
              
              {/* Orange gradient for the dot */}
              <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F97316" />
                <stop offset="100%" stopColor="#FBBF24" />
              </linearGradient>

              {/* Glow filter */}
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Stronger glow for orange dot */}
              <filter id="orangeGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* The C-shaped arc - animated stroke */}
            <g className="animate-logo-draw">
              <path
                d="M 140 100
                   A 50 50 0 1 0 100 50"
                fill="none"
                stroke="url(#purpleGradient)"
                strokeWidth="20"
                strokeLinecap="round"
                filter="url(#glow)"
                className="animate-stroke-dash"
              />
            </g>

            {/* Inner arc for depth */}
            <path
              d="M 130 100
                 A 40 40 0 1 0 100 60"
              fill="none"
              stroke="rgba(139, 92, 246, 0.3)"
              strokeWidth="8"
              strokeLinecap="round"
              className="animate-pulse-subtle"
            />

            {/* The orange dot - with orbit animation */}
            <g className="animate-orbit">
              <circle
                cx="130"
                cy="60"
                r="18"
                fill="url(#orangeGradient)"
                filter="url(#orangeGlow)"
                className="animate-pulse-dot"
              />
              {/* Inner highlight on dot */}
              <circle
                cx="125"
                cy="55"
                r="5"
                fill="rgba(255, 255, 255, 0.4)"
              />
            </g>

            {/* Orbiting particles around the logo */}
            <g className="animate-spin-slow">
              <circle cx="100" cy="30" r="2" fill="#8B5CF6" opacity="0.6" />
              <circle cx="170" cy="100" r="1.5" fill="#D946EF" opacity="0.5" />
              <circle cx="100" cy="170" r="2" fill="#F97316" opacity="0.4" />
              <circle cx="30" cy="100" r="1.5" fill="#A855F7" opacity="0.5" />
            </g>
          </svg>

          {/* Pulsing ring effect */}
          <div className="absolute inset-0 rounded-full border border-violet-500/30 animate-ping-slow" />
        </div>

        {/* Brand name */}
        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-orange-400 bg-clip-text text-transparent animate-gradient-x">
          Orkestria
        </h1>

        {/* Loading message */}
        <p className="text-white/60 text-sm mb-6 h-5 transition-all duration-500">
          {message || loadingMessages[currentMessage]}
        </p>

        {/* Progress bar */}
        {showProgress && (
          <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-orange-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Loading dots */}
        <div className="flex gap-2 mt-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
        
        @keyframes float-slow-reverse {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(20px) translateX(-10px); }
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 0.5; }
          75%, 100% { transform: scale(1.3); opacity: 0; }
        }
        
        @keyframes orbit {
          0% { transform: rotate(0deg) translateX(0); }
          25% { transform: rotate(5deg) translateX(2px); }
          50% { transform: rotate(0deg) translateX(0); }
          75% { transform: rotate(-5deg) translateX(-2px); }
          100% { transform: rotate(0deg) translateX(0); }
        }
        
        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        @keyframes pulse-subtle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        
        @keyframes stroke-dash {
          0% { stroke-dasharray: 0 1000; }
          100% { stroke-dasharray: 1000 0; }
        }
        
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes particle {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) scale(0); opacity: 0; }
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        
        .animate-float-slow {
          animation: float-slow 6s ease-in-out infinite;
        }
        
        .animate-float-slow-reverse {
          animation: float-slow-reverse 7s ease-in-out infinite;
        }
        
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        
        .animate-spin-reverse {
          animation: spin-reverse 15s linear infinite;
        }
        
        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        
        .animate-orbit {
          animation: orbit 3s ease-in-out infinite;
        }
        
        .animate-pulse-dot {
          animation: pulse-dot 2s ease-in-out infinite;
        }
        
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
        
        .animate-stroke-dash {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: stroke-dash 2s ease-out forwards;
        }
        
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
        
        .animate-particle {
          animation: particle 5s ease-in-out infinite;
        }
        
        .animate-pulse-glow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Simpler inline loader for smaller spaces
export function OrkestriaLoaderInline({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className={`relative ${sizeClasses[size]}`}>
      <svg viewBox="0 0 200 200" className="w-full h-full animate-spin-slow">
        <defs>
          <linearGradient id="inlinePurple" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#D946EF" />
          </linearGradient>
          <linearGradient id="inlineOrange" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>
        </defs>
        <path
          d="M 140 100 A 50 50 0 1 0 100 50"
          fill="none"
          stroke="url(#inlinePurple)"
          strokeWidth="20"
          strokeLinecap="round"
        />
        <circle cx="130" cy="60" r="18" fill="url(#inlineOrange)" />
      </svg>
      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 2s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default OrkestriaLoader;
