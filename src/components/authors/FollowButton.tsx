import React from 'react';
import KotobiFollowButton from '@/components/authors/KotobiFollowButton';

interface FollowButtonProps {
  isFollowing: boolean;
  loading: boolean;
  onClick: () => void;
  className?: string;
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  isFollowing,
  loading,
  onClick,
  className = ""
}) => (
  <KotobiFollowButton
    isFollowing={isFollowing}
    loading={loading}
    onPress={onClick}
    className={className}
  />
);
