import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  Home,
  Receipt,
  User,
  Settings,
  Shield,
  Heart,
  PhoneCall,
  ChevronLeft,
  ChevronRight,
  Share2,
  MessageCircle,
  X,
  Globe,
  MapPin,
  PlusCircle,
  Clock,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import CartButton from './CartButton';
import { useToast } from '@/hooks/use-toast';
import { useUiSettings } from '@/context/UiSettingsContext';
import { useLanguage } from '../context/LanguageContext';
import TopBar from './TopBar';
import Navbar from './Navbar';
import AppClosedOverlay from './AppClosedOverlay';
import ChatOverlay from './ChatOverlay';
import { getAppStatus } from '../utils/restaurantHours';
import CitySelectionModal from './CitySelectionModal';
import AssistantMascotIcon from './AssistantMascotIcon';
import ShareAppModal from './ShareAppModal';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { t, language, setLanguage, dir } = useLanguage();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [adminChatOpen, setAdminChatOpen] = useState(false);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const { getSetting } = useUiSettings();

  const isCitySelectionEnabled = getSetting('enable_city_selection') === 'true';
  const defaultCityName = getSetting('current_city_name') || 'تعز';
  const [currentSelectedCity, setCurrentSelectedCity] = useState<string>(() => {
    return localStorage.getItem('selected_city_name') || defaultCityName;
  });

  useEffect(() => {
    const handleCityChange = (e: any) => {
      const cityName = e.detail?.name || localStorage.getItem('selected_city_name') || defaultCityName;
      setCurrentSelectedCity(cityName);
    };
    window.addEventListener('cityChanged', handleCityChange);
    window.addEventListener('storage', handleCityChange);
    return () => {
      window.removeEventListener('cityChanged', handleCityChange);
      window.removeEventListener('storage', handleCityChange);
    };
  }, [defaultCityName]);

  const appStatus = (() => {
    const openingTime = getSetting('opening_time') || '08:00';
    const closingTime = getSetting('closing_time') || '23:00';
    const storeStatus = getSetting('store_status') || 'auto';
    const storeEmergencyClosed = getSetting('store_emergency_closed', 'false');
    const emergencyMessage = getSetting('store_emergency_message', '');
    const workingDays = getSetting('working_days', '0,1,2,3,4,5,6');
    return getAppStatus(openingTime, closingTime, storeStatus, storeEmergencyClosed, emergencyMessage, workingDays);
  })();

  const getS = (key: string, defaultValue: string) => getSetting(key) || defaultValue;

  const rawWa = getS('support_whatsapp', '967777146387').replace(/[^0-9]/g, '');
  const whatsappLink = rawWa.startsWith('967') ? `https://wa.me/${rawWa}` : `https://wa.me/967${rawWa}`;
  const rawPhone = getS('support_phone', '967777146387').replace(/[^0-9]/g, '');
  const phoneLink = `tel:+${rawPhone}`;
  const shareText = language === 'ar' ? getS('share_text', 'اطلب الآن عبر تطبيق الصايدي توصيل!') : 'Order now with Al-Saidi Delivery!';
  const shareUrl = getS('share_url', window.location.origin);
  const headerLogoUrl = getS('header_logo_url', '') || '/assets/saidi-logo.png';
  const sidebarLogoUrl = getS('sidebar_logo_url', '') || headerLogoUrl;
  const appName = getS('app_name', 'الصايدي توصيل');
  const appSubtitle = getS('app_subtitle', 'سرعة في التوصيل.. ثقة في التعامل');
  const appVersion = getS('app_version', '1.0.0');
  const sidebarTagline = language === 'ar' ? getS('sidebar_tagline', 'سرعة في التوصيل.. ثقة في التعامل.') : t('app_tagline');
  const supportTitle = language === 'ar' ? getS('text_support_title', 'نحن معك..') : t('support_title');

  const showShareButton = getSetting('show_share_button') !== 'false';
  const showContactButton = getSetting('show_contact_button') !== 'false';
  const showPrivacyButton = getSetting('show_privacy_button') !== 'false';
  const bottomBarEnabled = getSetting('bottom_bar_enabled') !== 'false';

  const isAdminPage = location.startsWith('/admin');
  const isDeliveryPage = location.startsWith('/delivery');
  const isDriverPage = location.startsWith('/driver');

  if (isAdminPage || isDeliveryPage || isDriverPage) {
    return <>{children}</>;
  }

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: appName,
          text: shareText,
          url: shareUrl || window.location.origin,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return;
        }
        console.warn('Native share failed or not allowed, opening share modal:', err);
      }
    }
    setShareModalOpen(true);
  };

  const sidebarMenuItems: Array<{ icon: any; label: string; path?: string; action?: () => void; id: string }> = [
    { id: 'home', icon: Home, label: t('home'), path: '/' },
    { id: 'wasalni', icon: PlusCircle, label: t('quick_order'), path: '/wasalni' },
    { id: 'orders', icon: Receipt, label: t('orders'), path: '/orders' },
    { id: 'track', icon: Clock, label: t('track_nav'), path: '/track-orders' },
    { id: 'favorites', icon: Heart, label: t('favorites'), path: '/favorites' },
    { id: 'profile', icon: User, label: t('my_account'), path: user ? '/profile' : '/auth' },
    { id: 'settings', icon: Settings, label: t('settings'), path: '/settings' },
    ...(showPrivacyButton ? [{ id: 'privacy', icon: Shield, label: t('privacy_policy'), path: '/privacy' }] : []),
    ...(showShareButton ? [{
      id: 'share',
      icon: Share2,
      label: language === 'ar' ? 'مشاركة التطبيق' : 'Share App',
      action: () => {
        setSidebarOpen(false);
        setTimeout(() => handleShare(), 150);
      }
    }] : []),
  ];

  const navigate = (path: string) => {
    setLocation(path);
    setSidebarOpen(false);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const effectiveUserId = user?.id || user?.phone || localStorage.getItem('customer_phone') || localStorage.getItem('customer_guest_id') || '';

  const { data: userConversationsData } = useQuery({
    queryKey: ['/api/messages/user-conversations', effectiveUserId, 'customer'],
    queryFn: async () => {
      if (!effectiveUserId) return { totalUnreadCount: 0 };
      const res = await fetch(`/api/messages/user-conversations?userId=${encodeURIComponent(effectiveUserId)}&userType=customer`);
      if (!res.ok) return { totalUnreadCount: 0 };
      return res.json();
    },
    enabled: !!effectiveUserId,
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const unreadChatCount = userConversationsData?.totalUnreadCount || 0;

  const customerPhone = user?.phone || localStorage.getItem('customer_phone') || '';
  const customerId = user?.id || '';
  const { data: customerNotifications = [] } = useQuery<Array<{ isRead?: boolean }>>({
    queryKey: ['/api/notifications/customer', customerPhone, customerId],
    queryFn: async () => {
      const qp = new URLSearchParams();
      if (customerId) qp.set('customerId', customerId);
      if (customerPhone) qp.set('phone', customerPhone);
      const res = await fetch(`/api/notifications/customer?${qp.toString()}`);
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 20000,
  });
  const unreadNotifCount = customerNotifications.filter((n) => !n.isRead).length;

  return (
    <div className="bg-[#F4F8FF] min-h-screen flex flex-col pb-20 md:pb-0" dir={dir}>
      <TopBar />
      {location.startsWith('/category/') && <Navbar />}

      {/* App Closed Overlay - يظهر فقط عند تفعيل الإغلاق الطارئ */}
      {appStatus.isEmergencyClosed && (
        <AppClosedOverlay
          openingTime={appStatus.openingTime}
          message={appStatus.message || (language === 'ar' ? "عذراً لا تستطيع الطلب الآن لأن التطبيق مغلق بصفة طارئة" : "Sorry, orders are temporarily closed at the moment")}
          onClose={() => {}}
          scheduledOrdersEnabled={getSetting('allow_scheduled_orders_when_closed') !== 'false'}
        />
      )}

      {/* Sidebar Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <button id="sidebar-trigger" className="hidden" />
        </SheetTrigger>
        <SheetContent side={language === 'ar' ? 'right' : 'left'} className="w-[320px] p-0 flex flex-col border-none shadow-2xl bg-gradient-to-b from-[#F4F8FF] to-white">

          {/* Hero header: Royal Blue gradient + subtle orange accent rim */}
          <div className="relative bg-gradient-to-b from-[#0B5ED7] via-[#064BB5] to-[#003B99] px-5 pt-8 pb-14 overflow-hidden">
            <div className="absolute -top-10 -right-6 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-[#FF6B00]/25 blur-xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#FF6B00] via-[#FF8A00] to-[#0B5ED7]" />

            <button
              onClick={() => setSidebarOpen(false)}
              className={`absolute top-4 ${language === 'ar' ? 'left-4' : 'right-4'} z-10 p-2 text-white/90 hover:text-white hover:bg-white/15 rounded-full transition-colors active:scale-95`}
              data-testid="button-close-sidebar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative flex flex-col items-center justify-center gap-2 mb-3">
              <img src={sidebarLogoUrl} alt={appName} className="h-14 w-auto object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.28)]" />
              <span className="text-[11px] font-bold text-white/90">{appSubtitle}</span>
            </div>

            <p className="relative text-center text-xs font-bold text-white/85 leading-snug px-4">
              {sidebarTagline}
            </p>
          </div>

          {/* Profile card - overlaps header */}
          <div className="relative -mt-8 px-5 z-10">
            <button
              onClick={() => navigate(user ? '/profile' : '/auth')}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-blue-100 shadow-[0_8px_20px_-4px_rgba(11,94,215,0.16)] hover:shadow-[0_12px_28px_-4px_rgba(11,94,215,0.22)] transition-all active:scale-[0.99]"
              data-testid="button-profile-card"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0B5ED7] to-[#003B99] flex items-center justify-center text-white font-black text-lg shadow-sm flex-shrink-0">
                {user ? (user.name?.charAt(0) || user.phone?.charAt(0) || 'U') : <User className="h-6 w-6" />}
              </div>
              <div className={`flex-1 ${language === 'ar' ? 'text-right' : 'text-left'} min-w-0`}>
                <p className="text-sm font-black text-slate-900 truncate">
                  {user ? (user.name || t('welcome')) : t('sign_in')}
                </p>
                <p className="text-[11px] font-bold text-slate-400 truncate">
                  {user?.phone || t('guest_sign_in_hint')}
                </p>
              </div>
              {language === 'ar' ? <ChevronLeft className="h-4 w-4 text-slate-300" /> : <ChevronRight className="h-4 w-4 text-slate-300" />}
            </button>
          </div>

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto px-4 pt-5 pb-4">
            <p className="px-2 mb-2 text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">
              {t('menu')}
            </p>
            <div className="space-y-1">
              {sidebarMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.path ? location === item.path : false;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.action) {
                        item.action();
                      } else if (item.path) {
                        navigate(item.path);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-l from-[#0B5ED7]/12 to-transparent ring-1 ring-[#0B5ED7]/30'
                        : 'hover:bg-blue-50/70'
                    }`}
                    data-testid={`link-sidebar-${item.id}`}
                  >
                    <div className={`w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 transition-colors ${
                      isActive
                        ? 'bg-gradient-to-br from-[#0B5ED7] to-[#0046B8] text-white shadow-md'
                        : 'bg-blue-50 text-[#0B5ED7]'
                    }`}>
                      <Icon className="h-[18px] w-[18px]" />
                    </div>
                    <span className={`text-sm flex-1 ${language === 'ar' ? 'text-right' : 'text-left'} ${isActive ? 'font-black text-[#0B5ED7]' : 'font-bold text-slate-700'}`}>
                      {item.label}
                    </span>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-[#FF6B00]" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="my-4 h-px bg-blue-100" />

            <p className="px-2 mb-2 text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">
              {t('preferences')}
            </p>

            {/* City Selection Toggle */}
            {isCitySelectionEnabled && (
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  setCityModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 hover:bg-blue-50 bg-gradient-to-r from-blue-50/80 to-sky-50/40 border border-blue-200/80 mb-2 shadow-xs group"
                data-testid="button-change-city"
              >
                <div className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 bg-gradient-to-br from-[#0B5ED7] to-[#0046B8] text-white shadow-xs group-hover:scale-105 transition-transform">
                  <MapPin className="h-[18px] w-[18px]" />
                </div>
                <div className={`flex-1 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                    {language === 'ar' ? 'المدينة:' : 'City:'} <span className="text-[#0B5ED7]">{currentSelectedCity}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold block mt-0.5">
                    {language === 'ar' ? 'اضغط لتغيير السيرفر والمدينة' : 'Switch city & server'}
                  </span>
                </div>
                <span className="text-[10px] font-black bg-[#FF6B00] text-white px-2.5 py-1 rounded-lg shadow-xs">
                  {language === 'ar' ? 'تغيير' : 'Change'}
                </span>
              </button>
            )}

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 hover:bg-blue-50/60"
              data-testid="button-toggle-language"
            >
              <div className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 bg-blue-50 text-[#0B5ED7]">
                <Globe className="h-[18px] w-[18px]" />
              </div>
              <div className={`flex-1 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                <span className="text-sm font-bold text-slate-700 block">
                  {language === 'ar' ? 'اللغة: العربية' : 'Language: English'}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {language === 'ar' ? 'التبديل إلى English' : 'Switch to العربية'}
                </span>
              </div>
              <span className="text-[11px] font-black bg-blue-100 text-[#0B5ED7] px-2.5 py-1 rounded-xl">
                {language === 'ar' ? 'EN' : 'عربي'}
              </span>
            </button>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-blue-100 bg-white">
            <div className="flex items-center justify-center gap-3 mb-3">
              {showShareButton && (
                <button
                  onClick={handleShare}
                  className="w-11 h-11 flex items-center justify-center rounded-2xl bg-blue-50 border border-blue-100 hover:bg-blue-100 shadow-xs transition-all"
                  data-testid="button-share"
                >
                  <Share2 className="h-[18px] w-[18px] text-[#0B5ED7]" />
                </button>
              )}
              {showContactButton && (
                <button
                  onClick={() => { setSidebarOpen(false); setSupportOpen(true); }}
                  className="flex-1 max-w-[190px] h-11 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FF8A00] to-[#FF5500] text-white font-black text-sm shadow-md hover:shadow-lg transition-all"
                  data-testid="button-contact-support"
                >
                  <MessageCircle className="h-4 w-4" />
                  {t('contact_us')}
                </button>
              )}
            </div>
            <p className="text-[10px] text-center text-slate-400 font-bold tracking-[0.2em]">
              {appName} · V{appVersion}
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Support Dialog (accessible from Sidebar, Profile, Support triggers) */}
      <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl border-none shadow-2xl overflow-hidden p-0">
          <DialogTitle className="sr-only">{supportTitle}</DialogTitle>
          <DialogDescription className="sr-only">{t('support_subtitle')}</DialogDescription>
          <div className="h-28 bg-gradient-to-r from-[#0B5ED7] to-[#003B99] p-6 flex items-end relative overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#FF8A00] to-[#FF5500]" />
            <h2 className="text-2xl font-black text-white tracking-tight">{supportTitle}</h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-slate-500 font-bold text-center text-sm">{t('support_subtitle')}</p>
            <div className="grid gap-3">
              <Button
                variant="outline"
                className="h-[72px] flex items-center justify-between px-5 rounded-2xl border-2 border-emerald-100 hover:bg-emerald-50 hover:border-emerald-300 group transition-all"
                onClick={() => { window.open(whatsappLink, '_blank'); setSupportOpen(false); }}
              >
                <div className="bg-emerald-100 p-2.5 rounded-xl group-hover:bg-emerald-200 transition-colors">
                  <MessageCircle className="h-6 w-6 text-emerald-600" />
                </div>
                <div className={`flex-1 ${language === 'ar' ? 'text-right mr-4' : 'text-left ml-4'}`}>
                  <p className="font-black text-lg text-slate-900">{t('whatsapp')}</p>
                  <p className="text-xs text-slate-400 font-bold">{t('talk_directly')}</p>
                </div>
                {language === 'ar' ? <ChevronLeft className="h-5 w-5 text-slate-300" /> : <ChevronRight className="h-5 w-5 text-slate-300" />}
              </Button>

              <Button
                variant="outline"
                className="h-[72px] flex items-center justify-between px-5 rounded-2xl border-2 border-blue-100 hover:bg-blue-50 hover:border-blue-300 group transition-all"
                onClick={() => { window.location.href = phoneLink; setSupportOpen(false); }}
              >
                <div className="bg-blue-100 p-2.5 rounded-xl group-hover:bg-blue-200 transition-colors">
                  <PhoneCall className="h-6 w-6 text-[#0B5ED7]" />
                </div>
                <div className={`flex-1 ${language === 'ar' ? 'text-right mr-4' : 'text-left ml-4'}`}>
                  <p className="font-black text-lg text-slate-900">{t('direct_call')}</p>
                  <p className="text-xs text-slate-400 font-bold">{t('instant_call')}</p>
                </div>
                {language === 'ar' ? <ChevronLeft className="h-5 w-5 text-slate-300" /> : <ChevronRight className="h-5 w-5 text-slate-300" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Mobile Bottom Navigation - Exact 4-tab Al-Saidi design matching 800a7534 & e7cf083a */}
      {bottomBarEnabled && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-blue-100 z-50 md:hidden grid grid-cols-4 items-center h-16 px-2 shadow-[0_-6px_24px_rgba(11,94,215,0.10)]">
          {/* 1. الرئيسية */}
          <button
            type="button"
            onClick={() => setLocation('/')}
            className={`flex flex-col items-center justify-center gap-0.5 transition-colors min-h-[44px] py-1 ${
              location === '/' ? 'text-[#0B5ED7]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Home className={`h-5 w-5 ${location === '/' ? 'fill-current' : ''}`} />
            <span className="text-[11px] font-black leading-tight whitespace-nowrap">{t('home')}</span>
            {location === '/' && <div className="h-1 w-6 bg-[#0B5ED7] rounded-full mt-0.5" />}
          </button>

          {/* 2. طلباتي */}
          <button
            type="button"
            onClick={() => setLocation('/orders')}
            className={`flex flex-col items-center justify-center gap-0.5 transition-colors min-h-[44px] py-1 ${
              location === '/orders' || location.startsWith('/orders/') ? 'text-[#0B5ED7]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Receipt className={`h-5 w-5 ${location === '/orders' ? 'fill-current' : ''}`} />
            <span className="text-[11px] font-black leading-tight whitespace-nowrap">{t('orders')}</span>
            {(location === '/orders' || location.startsWith('/orders/')) && (
              <div className="h-1 w-6 bg-[#0B5ED7] rounded-full mt-0.5" />
            )}
          </button>

          {/* 3. الإشعارات */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('openCustomerNotifications'))}
            className="relative flex flex-col items-center justify-center gap-0.5 transition-colors min-h-[44px] py-1 text-slate-500 hover:text-[#0B5ED7]"
          >
            <div className="relative">
              <Bell className="h-5 w-5" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-[#FF4D2D] text-white text-[10px] rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center font-black border border-white tabular-nums">
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </span>
              )}
            </div>
            <span className="text-[11px] font-black leading-tight whitespace-nowrap">{t('notifications')}</span>
          </button>

          {/* 4. حسابي */}
          <button
            type="button"
            onClick={() => setLocation(user ? '/profile' : '/auth')}
            className={`flex flex-col items-center justify-center gap-0.5 transition-colors min-h-[44px] py-1 ${
              location === '/profile' || location === '/auth' ? 'text-[#0B5ED7]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <User className={`h-5 w-5 ${location === '/profile' ? 'fill-current' : ''}`} />
            <span className="text-[11px] font-black leading-tight whitespace-nowrap">{t('account')}</span>
            {(location === '/profile' || location === '/auth') && (
              <div className="h-1 w-6 bg-[#0B5ED7] rounded-full mt-0.5" />
            )}
          </button>
        </nav>
      )}

      {/* Desktop Footer */}
      <footer className="hidden md:block bg-white border-t border-blue-100 py-10 mt-auto">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className={language === 'ar' ? 'text-right' : 'text-left'}>
            <div className="flex items-center gap-3 mb-2">
              <img src="/assets/saidi-logo.png" alt={appName} className="h-11 w-auto object-contain" />
              <div className="text-2xl font-black tracking-tight text-[#0B5ED7]">
                {appName}
              </div>
            </div>
            <p className="text-sm text-slate-500 font-semibold">{sidebarTagline}</p>
          </div>
          <div className={language === 'ar' ? 'text-right' : 'text-left'}>
            <h4 className="font-black text-base text-slate-900 mb-3">{t('quick_links')}</h4>
            <ul className="space-y-2 text-sm text-slate-600 font-semibold">
              <li><button onClick={() => setLocation('/wasalni')} className="hover:text-[#0B5ED7] transition-colors">{t('quick_order')}</button></li>
              <li><button onClick={() => setLocation('/orders')} className="hover:text-[#0B5ED7] transition-colors">{t('orders')}</button></li>
              <li><button onClick={() => setLocation('/track-orders')} className="hover:text-[#0B5ED7] transition-colors">{t('track_nav')}</button></li>
              <li><button onClick={() => setLocation('/favorites')} className="hover:text-[#0B5ED7] transition-colors">{t('favorites')}</button></li>
              <li><button onClick={() => setLocation('/profile')} className="hover:text-[#0B5ED7] transition-colors">{t('account')}</button></li>
              <li><button onClick={() => setLocation('/privacy')} className="hover:text-[#0B5ED7] transition-colors">{t('privacy_policy')}</button></li>
            </ul>
          </div>
          <div className={language === 'ar' ? 'text-right' : 'text-left'}>
            <h4 className="font-black text-base text-slate-900 mb-3">{t('contact_us')}</h4>
            <div className={`flex gap-3 ${language === 'ar' ? 'justify-end' : 'justify-start'}`}>
              <button onClick={handleShare} className="p-2.5 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors">
                <Share2 className="h-5 w-5 text-[#0B5ED7]" />
              </button>
              <button onClick={() => window.open(whatsappLink, '_blank')} className="p-2.5 bg-orange-50 hover:bg-orange-100 rounded-full transition-colors">
                <MessageCircle className="h-5 w-5 text-[#FF6B00]" />
              </button>
              <button onClick={() => setSupportOpen(true)} className="px-4 py-2 bg-[#0B5ED7] hover:bg-[#0046B8] text-white text-xs font-black rounded-full transition-colors">
                {t('support')}
              </button>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-8 pt-6 border-t border-blue-50 text-center space-y-1">
          <p className="text-xs text-slate-500 font-bold">
            © 2026 {appName} · {t('all_rights_reserved')}
          </p>
          <a
            href="https://wa.me/967777146387"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-slate-500 hover:text-[#0B5ED7] transition-colors font-medium underline underline-offset-2 cursor-pointer"
          >
            {language === 'ar' ? 'تصميم وبرمجة شركة اتقان سوفت' : 'Designed & Developed by ITQAN SOFT'}
          </a>
        </div>
      </footer>

      {/* Floating Cart Button & Modal Drawer */}
      <CartButton />

      {/* City Selection Modal */}
      <CitySelectionModal
        isOpen={cityModalOpen}
        onClose={() => setCityModalOpen(false)}
      />

      {/* Floating Live Chat Mascot Assistant */}
      <div className="fixed bottom-20 right-4 z-[2000] md:bottom-8 md:right-8 pointer-events-auto">
        <button
          onClick={() => {
            if (!user) {
              toast({
                title: language === 'ar' ? 'يجب تسجيل الدخول' : 'Login Required',
                description: language === 'ar' ? 'يرجى تسجيل الدخول لتتمكن من استخدام المحادثات المباشرة' : 'Please login to use live chat',
                variant: 'destructive',
              });
              setLocation('/auth');
              return;
            }
            setAdminChatOpen(true);
          }}
          className="group relative w-12 h-12 md:w-14 md:h-14 rounded-full shrink-0 flex items-center justify-center p-0 bg-transparent border-0 outline-none hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
          title={language === 'ar' ? 'مساعد الصايدي توصيل والمحادثات' : 'Al-Saidi Delivery Live Chat'}
        >
          <div className="relative w-12 h-12 md:w-14 md:h-14 shrink-0">
            <AssistantMascotIcon className="w-12 h-12 md:w-14 md:h-14" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#FF5500] text-white text-[10px] font-black rounded-full min-w-[20px] h-[20px] px-1 flex items-center justify-center border-2 border-white shadow-md animate-pulse">
                {unreadChatCount > 9 ? '9+' : unreadChatCount}
              </span>
            )}
          </div>
        </button>
      </div>

      <ChatOverlay
        isOpen={adminChatOpen}
        onClose={() => setAdminChatOpen(false)}
        userType="customer"
      />

      <ShareAppModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        appName={appName}
        shareText={shareText}
        shareUrl={shareUrl}
        logoUrl={sidebarLogoUrl}
      />
    </div>
  );
}
