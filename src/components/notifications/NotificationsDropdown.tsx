import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, XCircle, Clock, Eye, Trash2, RefreshCw, BookOpen, Heart } from '@/components/icons/kotobi-lucide';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNotification } from '@/context/NotificationContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  book_title?: string;
  book_author?: string;
  book_category?: string;
  book_submission_id?: string;
  target_url?: string;
  read: boolean;
  created_at: string;
}

interface NotificationsDropdownProps {
  children: React.ReactNode;
}

const EID_NOTIFICATION_ID = 'eid-al-fitr-2026';
const EID_NOTIFICATION_READ_KEY = 'eid_notification_read_2026';
const EID_NOTIFICATION_DELETED_KEY = 'eid_notification_deleted_2026';

const getEidNotification = (): Notification => ({
  id: EID_NOTIFICATION_ID,
  title: 'عيد فطر مبارك! 🎉🌙',
  message: 'كل عام وأنتم بخير بمناسبة عيد الفطر المبارك 🌟\nتقبّل الله صيامكم وطاعاتكم، وأعاده عليكم بالخير واليمن والبركات 🤲',
  type: 'success',
  book_title: 'فريق كتبي 📚',
  read: localStorage.getItem(EID_NOTIFICATION_READ_KEY) === 'true',
  created_at: '2026-03-30T09:00:00.000Z',
});

const CACHE_KEY_PREFIX = 'notifications_cache_v1_';
const FETCHED_FLAG_PREFIX = 'notifications_fetched_v1_';

const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({ children }) => {
  const { user } = useAuth();
  const cacheKey = user ? `${CACHE_KEY_PREFIX}${user.id}` : '';
  const fetchedKey = user ? `${FETCHED_FLAG_PREFIX}${user.id}` : '';

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    if (!cacheKey) return [];
    try {
      const cached = sessionStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isOpen, setIsOpen, shouldRefresh } = useNotification();
  const navigate = useNavigate();

  // حفظ الإشعارات في الكاش عند أي تغيير لتبقى متاحة بعد تحديث الصفحة
  useEffect(() => {
    if (!cacheKey) return;
    try { sessionStorage.setItem(cacheKey, JSON.stringify(notifications)); } catch {}
  }, [notifications, cacheKey]);

  // جلب فقط عند فتح الإشعارات لأول مرة في الجلسة (أو عند طلب تحديث صريح)
  useEffect(() => {
    if (!user || !isOpen) return;
    const alreadyFetched = sessionStorage.getItem(fetchedKey) === '1';
    if (!alreadyFetched) fetchNotifications();
  }, [user?.id, isOpen]);

  useEffect(() => {
    if (user && shouldRefresh) fetchNotifications();
  }, [user, shouldRefresh]);

  // اشتراك realtime: أي إشعار جديد للمستخدم يظهر فوراً ويُحدّث شارة العدّاد
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as any;
          setNotifications((prev) => {
            if (prev.some((x) => x.id === n.id)) return prev;
            return [
              {
                ...n,
                book_title: n.book_title || 'كتاب محذوف',
                book_author: n.book_author || 'مؤلف غير معروف',
                book_category: n.book_category || 'تصنيف غير محدد',
              },
              ...prev,
            ];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('خطأ في جلب الإشعارات:', error);
      } else {
        const cleanedNotifications = data?.map(notification => ({
          ...notification,
          book_title: notification.book_title || 'كتاب محذوف',
          book_author: notification.book_author || 'مؤلف غير معروف',
          book_category: notification.book_category || 'تصنيف غير محدد'
        })) || [];

        const shouldShowEidNotification = localStorage.getItem(EID_NOTIFICATION_DELETED_KEY) !== 'true';
        const finalNotifications = shouldShowEidNotification
          ? [getEidNotification(), ...cleanedNotifications]
          : cleanedNotifications;

        setNotifications(finalNotifications);
        try { sessionStorage.setItem(fetchedKey, '1'); } catch {}
      }
    } catch (error) {
      console.error('خطأ غير متوقع:', error);
    }
    setLoading(false);
  };

  const markAsRead = async (notificationId: string) => {
    if (notificationId === EID_NOTIFICATION_ID) {
      localStorage.setItem(EID_NOTIFICATION_READ_KEY, 'true');
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
      return;
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (!error) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId ? { ...notif, read: true } : notif
          )
        );
      }
    } catch (error) {
      console.error('خطأ في تحديث حالة الإشعار:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!user) return;

    if (notificationId === EID_NOTIFICATION_ID) {
      localStorage.setItem(EID_NOTIFICATION_DELETED_KEY, 'true');
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      toast({
        title: 'تم حذف الإشعار',
        description: 'تم حذف إشعار العيد بنجاح'
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('delete_user_notification', {
          p_notification_id: notificationId,
          p_user_id: user.id
        });

      if (error) {
        console.error('خطأ في حذف الإشعار:', error);
      } else if (data) {
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
        toast({
          title: 'تم حذف الإشعار',
          description: 'تم حذف الإشعار بنجاح'
        });
      }
    } catch (error) {
      console.error('خطأ غير متوقع في حذف الإشعار:', error);
    }
  };

  const deleteAllNotifications = async () => {
    if (!user || notifications.length === 0) return;

    const hasEidNotification = notifications.some(notification => notification.id === EID_NOTIFICATION_ID);

    try {
      const { data, error } = await supabase
        .rpc('delete_all_user_notifications', { p_user_id: user.id });

      if (error) {
        console.error('خطأ في حذف جميع الإشعارات:', error);
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء حذف الإشعارات',
          variant: 'destructive'
        });
      } else {
        if (hasEidNotification) {
          localStorage.setItem(EID_NOTIFICATION_DELETED_KEY, 'true');
        }
        setNotifications([]);
        toast({
          title: 'تم حذف جميع الإشعارات',
          description: `تم حذف ${Number(data || 0) + (hasEidNotification ? 1 : 0)} إشعار بنجاح`
        });
      }
    } catch (error) {
      console.error('خطأ غير متوقع:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <Clock className="h-4 w-4 text-sky-500" />;
      case 'new_book': return <BookOpen className="h-4 w-4 text-purple-500" />;
      case 'review_like': return <Heart className="h-4 w-4 text-red-500" />;
      case 'ai_suggestion': return <Bell className="h-4 w-4 text-emerald-500" />;
      default: return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.target_url) {
      setIsOpen(false);
      navigate(notification.target_url);
    }
  };

  const getNotificationBadge = (type: string, title: string) => {
    if (title.includes('أهلاً بك في') || title.includes('كتبي')) {
      return (
        <img
          src="/favicon.png"
          alt="كتبي"
          className="w-10 h-10 object-contain"
        />
      );
    }
    if (type === 'new_book') {
      return (
        <Badge variant="default" className="bg-purple-500 hover:bg-purple-600 text-white border-purple-600 text-xs">كتاب جديد</Badge>
      );
    }
    if (type === 'review_like') {
      return (
        <Badge variant="default" className="bg-red-400 hover:bg-red-500 text-white border-red-500 text-xs">إعجاب</Badge>
      );
    }
    if (type === 'success' && (title.includes('تحديث') || title.includes('صورة') || title.includes('اسم'))) {
      return (
        <Badge
          variant="default"
          className="bg-blue-500 hover:bg-blue-600 text-white border-blue-600 text-xs"
        >
          تحديث
        </Badge>
      );
    }
    if (type === 'success' && title.includes('تمت الموافقة')) {
      return (
        <Badge
          variant="default"
          className="bg-green-500 hover:bg-green-600 text-white border-green-600 text-xs"
        >
          موافقة
        </Badge>
      );
    }
    if (type === 'ai_suggestion') {
      return <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600 text-xs">🤖 ذكي</Badge>;
    }
    switch (type) {
      case 'error':
        return <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 text-white border-red-600 text-xs">رفض</Badge>;
      case 'warning':
        return <Badge variant="outline" className="border-sky-500 text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 text-xs">تحذير</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">كتبي</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'الآن';
    if (diffInMinutes < 60) return `منذ ${diffInMinutes} د`;
    if (diffInHours < 24) return `منذ ${diffInHours} س`;
    if (diffInDays < 7) return `منذ ${diffInDays} يوم`;
    return date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          {children}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="w-[calc(100vw-1rem)] max-w-[26rem] p-0 rounded-2xl border-[3px] border-clash-gold-deep bg-clash-panel shadow-2xl overflow-hidden"
        align="end"
        sideOffset={8}
        collisionPadding={8}
      >
        {/* رأس اللوحة بأسلوب Clash */}
        <div className="relative bg-clash-deep border-b-[3px] border-clash-gold-deep px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-clash-gold-deep bg-clash-gold shadow-inner">
                <Bell className="h-4 w-4 text-clash-bubble-foreground" />
              </span>
              <div className="text-right leading-tight">
                <p className="text-sm font-extrabold tracking-wide !text-clash-gold drop-shadow">الأخبار والإشعارات</p>
                <p className="text-[10px] !text-clash-foreground/70">
                  {notifications.length} إشعار{unreadCount > 0 ? ` • ${unreadCount} جديد` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <button
                  onClick={deleteAllNotifications}
                  title="حذف جميع الإشعارات"
                  className="rounded-lg border-2 border-clash-gold-deep bg-destructive/90 px-2 py-1 text-[10px] font-bold text-destructive-foreground shadow active:translate-y-[1px]"
                >
                  <Trash2 className="ml-1 inline h-3 w-3" />
                  حذف الكل
                </button>
              )}
              <button
                onClick={fetchNotifications}
                disabled={loading}
                title="تحديث"
                className="rounded-lg border-2 border-clash-gold-deep bg-clash-gold p-1.5 text-clash-bubble-foreground shadow active:translate-y-[1px] disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        <ScrollArea className="h-[26rem] bg-clash-panel">
          {loading ? (
            <div className="p-6 text-center text-sm text-clash-foreground/80">جاري تحميل الإشعارات...</div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-clash-foreground/80">لا توجد إشعارات</div>
          ) : (
            <div className="space-y-4 p-3">
              {notifications.map((notification) => (
                <div key={notification.id} className="text-right">
                  {/* هوية المرسل */}
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-clash-gold-deep bg-clash-deep shadow">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="leading-tight">
                      <p className="text-xs font-extrabold !text-clash-gold">{notification.title}</p>
                      <p className="text-[10px] !text-clash-foreground/60">
                        {notification.book_title && notification.book_title !== 'كتاب محذوف'
                          ? notification.book_title
                          : 'فريق كتبي'}
                      </p>
                    </div>
                  </div>

                  {/* فقاعة الرسالة */}
                  <div
                    onClick={() => handleNotificationClick(notification)}
                    className={`relative rounded-2xl border-2 border-clash-gold-deep/60 bg-clash-bubble px-3.5 py-3 text-clash-bubble-foreground shadow-[0_3px_0_hsl(var(--clash-panel-deep))] transition-transform ${
                      notification.target_url ? 'cursor-pointer active:translate-y-[1px]' : ''
                    } ${!notification.read ? 'ring-2 ring-clash-gold' : ''}`}
                  >
                    <p className="whitespace-pre-wrap text-[13px] font-medium leading-relaxed !text-clash-bubble-foreground">
                      {notification.message}
                    </p>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-clash-bubble-muted">{formatDate(notification.created_at)}</span>
                      <div className="flex items-center gap-1">
                        {getNotificationBadge(notification.type, notification.title)}
                        {!notification.read && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                            title="وضع علامة مقروء"
                            className="rounded-md p-1 text-clash-bubble-muted hover:text-clash-bubble-foreground"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                          title="حذف الإشعار"
                          className="rounded-md p-1 text-destructive hover:opacity-80"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsDropdown;
