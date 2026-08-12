import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { IconBookThumbUp, IconBookThumbDown } from '@/components/icons/KotobiVoteIcons';
import { useBookLikes } from '@/hooks/useBookLikes';
import { useBookDislikes } from '@/hooks/useBookDislikes';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';

interface BookLikeDislikeButtonsProps {
  bookId: string;
  size?: 'sm' | 'lg';
  showCount?: boolean;
  className?: string;
  likeClassName?: string;
  dislikeClassName?: string;
  layout?: 'row' | 'column';
}

export const BookLikeDislikeButtons: React.FC<BookLikeDislikeButtonsProps> = ({
  bookId,
  size = 'sm',
  showCount = true,
  className = '',
  likeClassName = '',
  dislikeClassName = '',
  layout = 'row',
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { likesCount, isLiked, loading: likeLoading, toggleLike, removeLikeLocally } = useBookLikes(bookId);
  const { dislikesCount, isDisliked, loading: dislikeLoading, toggleDislike, removeDislikeLocally } = useBookDislikes(bookId);

  const [burst, setBurst] = useState<'up' | 'down' | null>(null);
  const burstTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(burstTimer.current), []);

  const triggerBurst = (kind: 'up' | 'down') => {
    setBurst(kind);
    clearTimeout(burstTimer.current);
    burstTimer.current = setTimeout(() => setBurst(null), 650);
  };

  const requireAuth = () => {
    const redirectPath = location.pathname + location.search;
    localStorage.setItem('auth_redirect_path', redirectPath);
    navigate('/auth');
  };

  const handleLike = async () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول لإضافة الإعجاب');
      requireAuth();
      return;
    }
    triggerBurst('up');
    if (isDisliked) removeDislikeLocally();
    try {
      await toggleLike();
    } catch (e) {
      console.error('خطأ في تبديل الإعجاب:', e);
      toast.error('حدث خطأ، حاول مرة أخرى');
    }
  };

  const handleDislike = async () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول لإضافة عدم الإعجاب');
      requireAuth();
      return;
    }
    triggerBurst('down');
    if (isLiked) removeLikeLocally();
    try {
      await toggleDislike();
    } catch (e) {
      console.error('خطأ في تبديل عدم الإعجاب:', e);
      toast.error('حدث خطأ، حاول مرة أخرى');
    }
  };



  const iconBoxClasses = {
    sm: 'h-5 w-5',
    lg: 'h-7 w-7',
  };
  const buttonSizeClasses = {
    sm: 'h-9 px-3 text-sm',
    lg: 'h-12 px-5 text-base',
  };

  const containerClass = layout === 'row' ? 'flex items-center gap-2' : 'flex flex-col gap-2';

  const baseClash =
    'inline-flex items-center gap-2 rounded-2xl border-2 font-extrabold transition-transform active:scale-95 disabled:opacity-60';

  return (
    <div className={`${containerClass} ${className}`} dir="rtl">
      <button
        type="button"
        onClick={handleLike}
        disabled={likeLoading || dislikeLoading}
        aria-pressed={isLiked}
        aria-label="أعجبني"
        className={`kotobi-vote-btn is-up ${burst === 'up' ? 'is-bursting' : ''} ${baseClash} ${buttonSizeClasses[size]} ${likeClassName} border-clash-gold-deep/70 bg-clash-deep shadow-[0_3px_0_hsl(var(--clash-panel-deep))] ${
          isLiked ? '!text-clash-gold ring-2 ring-clash-gold/70' : '!text-clash-foreground/90'
        }`}
      >
        <span className={`kotobi-vote-icon ${iconBoxClasses[size]}`}>
          <IconBookThumbUp />
        </span>
        {showCount && <span className="kotobi-vote-count tabular-nums">{likesCount}</span>}
        <span className="kotobi-vote-ring" aria-hidden="true" />
        <span className="kotobi-vote-sparks" aria-hidden="true"><i /><i /><i /><i /><i /></span>
      </button>

      <button
        type="button"
        onClick={handleDislike}
        disabled={likeLoading || dislikeLoading}
        aria-pressed={isDisliked}
        aria-label="لم يعجبني"
        className={`kotobi-vote-btn is-down ${burst === 'down' ? 'is-bursting' : ''} ${baseClash} ${buttonSizeClasses[size]} ${dislikeClassName} border-clash-gold-deep/70 bg-clash-deep shadow-[0_3px_0_hsl(var(--clash-panel-deep))] ${
          isDisliked ? '!text-clash-gold ring-2 ring-clash-gold/70' : '!text-clash-foreground/90'
        }`}
      >
        <span className={`kotobi-vote-icon ${iconBoxClasses[size]}`}>
          <IconBookThumbDown />
        </span>
        {showCount && <span className="kotobi-vote-count tabular-nums">{dislikesCount}</span>}
        <span className="kotobi-vote-ring" aria-hidden="true" />
        <span className="kotobi-vote-sparks" aria-hidden="true"><i /><i /><i /><i /><i /></span>
      </button>
    </div>
  );
};

