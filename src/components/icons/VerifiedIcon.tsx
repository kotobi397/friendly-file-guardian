import React from 'react';
import KotobiVerifiedIcon from './KotobiVerifiedIcon';

interface VerifiedIconProps {
  className?: string;
  size?: number;
}

const VerifiedIcon: React.FC<VerifiedIconProps> = ({ className = 'w-4 h-4', size = 24 }) => (
  <KotobiVerifiedIcon className={className} size={size} />
);

export default VerifiedIcon;
