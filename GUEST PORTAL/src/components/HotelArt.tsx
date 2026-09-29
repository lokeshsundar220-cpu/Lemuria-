import React from 'react';

interface HotelArtProps {
  index: number;
  height?: number;
}

export const HotelArt: React.FC<HotelArtProps> = ({ index, height = 170 }) => {
  const colors = [
    ['#0c2d4a', '#D4A84F'],
    ['#0b3b5c', '#f59e0b'],
    ['#12324a', '#e7c778']
  ][index % 3];

  return (
    <div
      className="art"
      style={{
        height: `${height}px`,
        background: `linear-gradient(180deg, ${colors[0]}, #071A2B)`
      }}
    >
      <svg
        viewBox={`0 0 300 ${height}`}
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
      >
        <circle cx={220 - index * 30} cy="50" r="22" fill={colors[1]} opacity=".9" />
        <path
          d={`M0 ${height}V110h30V80h40v30h20V60h50v50h30V90h44v20h26V70h60v${height - 70}z`}
          fill="#071A2B"
          opacity=".85"
        />
        <path d={`M0 ${height}V135h300v${height - 135}z`} fill="#0a2540" />
      </svg>
    </div>
  );
};
