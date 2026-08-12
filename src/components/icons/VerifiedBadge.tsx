import React from 'react';
import KotobiVerifiedIcon from './KotobiVerifiedIcon';

interface VerifiedBadgeProps {
  className?: string;
  size?: number;
}

const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ className = '', size = 16 }) => (
  <KotobiVerifiedIcon className={className} size={size} />
);

export default VerifiedBadge;
