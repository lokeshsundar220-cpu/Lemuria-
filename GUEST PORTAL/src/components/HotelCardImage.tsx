import React, { useState } from 'react';
import { HotelArt } from './HotelArt';

interface HotelCardImageProps {
  imageUrl?: string;
  name: string;
  index: number;
  height?: number;
  aspectRatio?: string;
  className?: string;
}

export const HotelCardImage: React.FC<HotelCardImageProps> = ({
  imageUrl,
  name,
  index,
  height = 190,
  aspectRatio = '16 / 10',
  className = ''
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // If no URL or load failed, seamlessly fall back to project's HotelArt
  if (!imageUrl || hasError) {
    return <HotelArt index={index} height={height} />;
  }

  return (
    <div
      className={`hotel-media-wrapper ${className}`}
      style={{
        width: '100%',
        height: `${height}px`,
        aspectRatio,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#071A2B'
      }}
    >
      {!isLoaded && (
        <div
          className="hotel-media-skeleton"
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, #071A2B 20%, #0d2f4d 50%, #071A2B 80%)',
            backgroundSize: '200% 100%',
            animation: 'hotelShimmer 1.6s infinite'
          }}
        />
      )}
      <img
        src={imageUrl}
        alt={`${name} luxury hospitality property view`}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          display: 'block',
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.45s ease, transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      />
    </div>
  );
};
