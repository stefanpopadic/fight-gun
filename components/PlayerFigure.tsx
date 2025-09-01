import React from 'react';

interface PlayerFigureProps {
  color: string;
  angle: number;
}

export const PlayerFigure: React.FC<PlayerFigureProps> = ({ color, angle }) => (
  <svg
    width="30"
    height="30"
    viewBox="0 0 40 40"
    xmlns="http://www.w3.org/2000/svg"
    className="overflow-visible"
  >
    <g fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      {/* Head */}
      <circle cx="20" cy="8" r="5" />
      {/* Body */}
      <line x1="20" y1="13" x2="20" y2="25" />
      {/* Legs */}
      <line x1="20" y1="25" x2="15" y2="35" />
      <line x1="20" y1="25" x2="25" y2="35" />
      {/* Static Left Arm */}
      <line x1="20" y1="18" x2="10" y2="22" />
      
      {/* Rotating Right Arm and Pistol */}
      <g transform={`rotate(${angle}, 20, 18)`}>
        {/* Right arm */}
        <line x1="20" y1="18" x2="30" y2="18" />
        {/* Pistol */}
        <path d="M 30 16 L 38 16 L 38 20 L 32 20 Z" fill={color} stroke={color} />
      </g>
    </g>
  </svg>
);