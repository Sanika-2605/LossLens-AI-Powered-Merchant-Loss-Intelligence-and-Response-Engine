import React from 'react';

interface IllustrationProps {
  type?: 'overview' | 'discovery' | 'safe' | 'empty';
  className?: string;
}

export const AnimatedIllustration: React.FC<IllustrationProps> = ({
  type = 'overview',
  className = ''
}) => {
  if (type === 'safe') {
    return (
      <div className={`relative flex items-center justify-center p-6 ${className}`}>
        <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-48 h-36">
          <circle cx="100" cy="80" r="50" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="2" />
          <circle cx="100" cy="80" r="35" fill="#dcfce7" />
          <path d="M85 80L95 90L115 70" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="50" cy="40" r="6" fill="#cbd5e1" opacity="0.5" />
          <circle cx="150" cy="40" r="6" fill="#cbd5e1" opacity="0.5" />
          <circle cx="160" cy="120" r="8" fill="#cbd5e1" opacity="0.5" />
          <circle cx="40" cy="110" r="7" fill="#cbd5e1" opacity="0.5" />
        </svg>
      </div>
    );
  }

  if (type === 'discovery') {
    return (
      <div className={`relative flex items-center justify-center p-4 ${className}`}>
        <svg viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-44">
          <rect x="20" y="20" width="200" height="140" rx="16" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
          <path d="M40 120 C80 110, 100 60, 140 80 C180 100, 190 50, 200 40" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />
          
          {/* Lens focus area */}
          <circle cx="130" cy="75" r="40" fill="#eff6ff" fillOpacity="0.8" stroke="#3b82f6" strokeWidth="2" />
          <line x1="158" y1="103" x2="185" y2="130" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" />

          {/* Connected Risk nodes inside focus */}
          <circle cx="115" cy="65" r="6" fill="#3b82f6" />
          <circle cx="145" cy="70" r="6" fill="#9333ea" />
          <circle cx="130" cy="90" r="8" fill="#dc2626" />
          <line x1="115" y1="65" x2="130" y2="90" stroke="#dc2626" strokeWidth="1.5" />
          <line x1="145" y1="70" x2="130" y2="90" stroke="#dc2626" strokeWidth="1.5" />
        </svg>
      </div>
    );
  }

  // Default Overview hero illustration: Connected transaction network analyzed by intelligent lens
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 280 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[280px] h-auto">
        {/* Background Network Mesh Grid */}
        <path d="M20 40 L80 20 L140 50 L200 30 L260 60" stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="3 3" />
        <path d="M40 100 L100 120 L160 90 L220 110" stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="3 3" />
        <path d="M80 20 L100 120" stroke="#e2e8f0" strokeWidth="1.5" />
        <path d="M140 50 L160 90" stroke="#e2e8f0" strokeWidth="1.5" />
        <path d="M200 30 L220 110" stroke="#e2e8f0" strokeWidth="1.5" />

        {/* Regular Entity Nodes */}
        <circle cx="20" cy="40" r="5" fill="#94a3b8" />
        <circle cx="80" cy="20" r="5" fill="#94a3b8" />
        <circle cx="40" cy="100" r="5" fill="#94a3b8" />
        <circle cx="260" cy="60" r="5" fill="#94a3b8" />
        <circle cx="220" cy="110" r="5" fill="#94a3b8" />

        {/* Intelligent Lens Focus Area */}
        <g className="transition-transform duration-500 hover:scale-105">
          <circle cx="150" cy="70" r="45" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" className="shadow-lg" />
          <circle cx="150" cy="70" r="45" fill="#eff6ff" fillOpacity="0.7" />
          <circle cx="150" cy="70" r="40" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 2" />

          {/* Suspicious Connected Nodes in Lens */}
          <line x1="130" y1="55" x2="170" y2="55" stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1="130" y1="55" x2="150" y2="85" stroke="#dc2626" strokeWidth="2" />
          <line x1="170" y1="55" x2="150" y2="85" stroke="#dc2626" strokeWidth="2" />

          <circle cx="130" cy="55" r="6" fill="#2563eb" />
          <circle cx="170" cy="55" r="6" fill="#9333ea" />
          <circle cx="150" cy="85" r="8" fill="#dc2626" />
          <circle cx="150" cy="85" r="3" fill="#ffffff" />
        </g>
      </svg>
    </div>
  );
};
