import React, { useState } from 'react';
import { useLocation } from 'wouter';
import {
  ShoppingCart,
  Heart,
  User,
  Search,
  Menu as MenuIcon,
  Clock,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useUiSettings } from '@/context/UiSettingsContext';
import { getAppStatus } from '../utils/restaurantHours';
import { CustomerNotificationsPanel } from './CustomerNotificationsPanel';

// مؤشر ساعات العمل بتصميم هادئ متناسق مع الخلفية السماوية
const WorkingHoursIndicator: React.FC = () => {
  const { getSetting } = useUiSettings();
  const { t, language } = useLanguage();
  const storeStatus = getSetting('store_status') || 'auto';
  const openingTime = getSetting('opening_time') || '08:00';
  const closingTime = getSetting('closing_time') || '23:00';
  const storeEmergencyClosed = getSetting('store_emergency_closed', 'false');
  const emergencyMessage = getSetting('store_emergency_message', '');
  const workingDays = getSetting('working_days', '0,1,2,3,4,5,6');

  const computeStatus = () =>
    getAppStatus(
      openingTime,
      closingTime,
      storeStatus,
      storeEmergencyClosed,
      emergencyMessage,
      workingDays
    );

  const [appStatus, setAppStatus] = React.useState(computeStatus);

  React.useEffect(() => {
    setAppStatus(computeStatus());
    const timer = setInterval(() => setAppStatus(computeStatus()), 15000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeStatus, openingTime, closingTime, storeEmergencyClosed, emergencyMessage, workingDays]);

  const isOpen = appStatus.isOpen;

  const format12 = (timeStr: string): string => {
    if (!timeStr || !timeStr.includes(':')) return timeStr;
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10);
    const m = (mStr || '00').padStart(2, '0');
    if (isNaN(h)) return timeStr;
    const suffix = language === 'ar' ? (h >= 12 ? 'م' : 'ص') : (h >= 12 ? 'PM' : 'AM');
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${suffix}`;
  };

  return (
    <div className="relative px-3.5 pb-2.5">
      <div
        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-colors ${
          isOpen
            ? 'bg-white/85 border-blue-200/80 text-slate-800 shadow-xs'
            : 'bg-rose-50/90 border-rose-200 text-rose-900 shadow-xs'
        }`}
        data-testid="indicator-working-hours"
      >
        <div className="relative flex-shrink-0">
          <span
            className={`absolute inset-0 rounded-full ${
              isOpen ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'
            } opacity-50`}
          />
          <span
            className={`relative block w-2.5 h-2.5 rounded-full ${
              isOpen ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          />
        </div>
        <Clock className={`h-3.5 w-3.5 flex-shrink-0 ${isOpen ? 'text-[#0B5ED7]' : 'text-rose-600'}`} />
        <div className={`flex-1 min-w-0 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
          <div className="text-[11px] font-bold text-slate-700 truncate leading-tight">
            {isOpen ? t('app_open_now') : t('app_closed_now')} • {format12(openingTime)} - {format12(closingTime)}
          </div>
        </div>
        <span
          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full flex-shrink-0 ${
            isOpen
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              : 'bg-rose-100 text-rose-700 border border-rose-200'
          }`}
        >
          {isOpen ? t('open') : t('closed')}
        </span>
      </div>
    </div>
  );
};

export const TopBar: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { state } = useCart();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { getSetting, loading: settingsLoading } = useUiSettings();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const logoUrl = getSetting('header_logo_url') || getSetting('logo_url') || '/assets/saidi-logo.png';
  const appName = getSetting('app_name') || 'الصايدي توصيل';
  const appSubtitle = getSetting('app_subtitle') || 'سرعة في التوصيل.. ثقة في التعامل';

  const isSubPage = location !== '/';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
    }
  };

  const handleOpenCart = () => {
    window.dispatchEvent(new CustomEvent('openCart'));
  };

  const getItemCount = () => state.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="sticky top-0 z-50">
      {/* Desktop Header - Al-Saidi Sky + Royal Blue + Orange Accent */}
      <div className="hidden md:block bg-gradient-to-b from-[#DCEBFF] via-[#EEF5FF] to-white border-b border-blue-100 shadow-sm relative overflow-hidden">
        {/* Subtle decorative royal blue & orange corner wave */}
        <div className="absolute top-0 right-0 w-44 h-1.5 bg-gradient-to-l from-[#0B5ED7] via-[#FF6B00] to-transparent" />
        <div className="container mx-auto px-4 py-2.5 flex items-center justify-between gap-6">
          <div
            className="cursor-pointer shrink-0 flex items-center gap-3 group"
            onClick={() => setLocation('/')}
            data-testid="link-home-logo"
          >
            {settingsLoading ? (
              <div className="h-12 w-28 bg-blue-100 animate-pulse rounded-xl" />
            ) : (
              <img
                src={logoUrl}
                alt={appName}
                className="h-12 w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-[0_4px_10px_rgba(11,94,215,0.18)]"
              />
            )}
            <div className="flex flex-col leading-none">
              <span className="text-xl font-black text-[#0B5ED7] tracking-tight">{appName}</span>
              <span className="text-[11px] font-bold text-[#FF6B00] mt-1">{appSubtitle}</span>
            </div>
          </div>

          <div className="flex-1 max-w-2xl">
            <form onSubmit={handleSearch} className="relative group">
              <Input
                className="w-full pr-12 pl-4 h-11 bg-white border border-blue-200/80 focus:border-[#0B5ED7] focus:ring-2 focus:ring-blue-100 rounded-2xl shadow-xs transition-all text-sm font-bold text-slate-800 placeholder-slate-400"
                placeholder={t('search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="submit"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#0B5ED7] hover:text-[#FF6B00] transition-colors"
                aria-label="search"
              >
                <Search className="h-5 w-5" />
              </button>
            </form>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="bg-white border border-blue-100 rounded-2xl p-0.5 shadow-xs">
              <CustomerNotificationsPanel lightVariant />
            </div>

            <button
              onClick={() => setLocation(user ? '/profile' : '/auth')}
              className="p-2.5 bg-white hover:bg-blue-50 border border-blue-100 rounded-2xl text-[#0B5ED7] transition-all active:scale-95 shadow-xs"
              aria-label="profile"
            >
              <User className="h-5 w-5" />
            </button>

            <button
              onClick={() => setLocation('/favorites')}
              className="p-2.5 bg-white hover:bg-blue-50 border border-blue-100 rounded-2xl text-[#0B5ED7] transition-all active:scale-95 shadow-xs"
              aria-label="favorites"
            >
              <Heart className="h-5 w-5" />
            </button>

            <button
              onClick={handleOpenCart}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-[#0B5ED7] to-[#0046B8] hover:from-[#0A53BE] hover:to-[#003B99] text-white rounded-2xl transition-all active:scale-95 relative shadow-md shadow-blue-500/20"
              aria-label="cart"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="text-xs font-black">{t('cart')}</span>
              {getItemCount() > 0 && (
                <span className="bg-[#FF6B00] text-white text-[10px] rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center font-black border border-white shadow-sm">
                  {getItemCount()}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Header - Al-Saidi Sky + Glossy Logo + Royal Blue Icons */}
      <div className="md:hidden relative bg-gradient-to-b from-[#DCEBFF] via-[#EDF4FF] to-white/95 border-b border-blue-100 shadow-sm overflow-hidden rounded-b-[26px]">
        {/* Decorative top swoosh corner like screenshots */}
        <svg
          viewBox="0 0 220 48"
          className="absolute top-0 left-0 w-36 h-auto pointer-events-none opacity-90"
          preserveAspectRatio="none"
        >
          <path d="M0 0 H185 C135 22 65 36 0 42 Z" fill="#0B5ED7" />
          <path d="M0 39 C65 34 135 20 185 0 H198 C142 25 70 40 0 46 Z" fill="#FF6B00" />
        </svg>

        <div className="relative px-3.5 pt-2.5 pb-2 flex items-center justify-between gap-2">
          {/* Leading (RTL right): Menu / Back + Notifications */}
          <div className="flex items-center gap-1.5">
            {isSubPage ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-[#0B5ED7] bg-white hover:bg-blue-50 border border-blue-100 shrink-0 rounded-full shadow-xs active:scale-95 transition-transform"
                onClick={() => window.history.length > 1 ? window.history.back() : setLocation('/')}
                aria-label="back"
              >
                {language === 'ar' ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-[#0B5ED7] bg-white hover:bg-blue-50 border border-blue-100 shrink-0 rounded-full shadow-xs active:scale-95 transition-transform"
                onClick={() => document.getElementById('sidebar-trigger')?.click()}
                aria-label="menu"
              >
                <MenuIcon className="h-5 w-5" />
              </Button>
            )}
            <CustomerNotificationsPanel lightVariant />
          </div>

          {/* Center: Glossy Al-Saidi Logo */}
          <div
            className="flex-1 flex items-center justify-center cursor-pointer"
            onClick={() => setLocation('/')}
            data-testid="link-home-logo-mobile"
          >
            {settingsLoading ? (
              <div className="h-10 w-24 bg-blue-100 animate-pulse rounded-xl" />
            ) : (
              <img
                src={logoUrl}
                alt={appName}
                className="h-11 w-auto max-w-[140px] object-contain drop-shadow-[0_3px_8px_rgba(11,94,215,0.2)]"
              />
            )}
          </div>

          {/* Trailing (RTL left): Search + Cart */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="h-10 w-10 flex items-center justify-center text-[#0B5ED7] bg-white hover:bg-blue-50 border border-blue-100 rounded-full shadow-xs transition-all active:scale-95"
              aria-label="search"
            >
              <Search className="h-5 w-5" />
            </button>
            <button
              onClick={handleOpenCart}
              className="h-10 w-10 flex items-center justify-center text-white bg-gradient-to-br from-[#0B5ED7] to-[#0046B8] hover:from-[#0A53BE] hover:to-[#003B99] rounded-full transition-all active:scale-95 relative shadow-md shadow-blue-500/20"
              aria-label="cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {getItemCount() > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#FF6B00] text-white text-[10px] rounded-full h-4.5 min-w-[18px] px-1 flex items-center justify-center font-black border-2 border-white shadow-sm">
                  {getItemCount()}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Working Hours Indicator */}
        <WorkingHoursIndicator />

        {/* Mobile Search Bar - Expandable */}
        {isSearchOpen && (
          <div className="relative px-3.5 pb-3.5 pt-1">
            <form onSubmit={handleSearch} className="relative">
              <input
                autoFocus
                className="w-full bg-white text-slate-900 placeholder-slate-400 border border-blue-200 rounded-2xl px-4 py-2.5 pr-11 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#0B5ED7] shadow-sm"
                placeholder={t('search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-gradient-to-br from-[#0B5ED7] to-[#0046B8] text-white flex items-center justify-center shadow"
              >
                <Search className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopBar;
