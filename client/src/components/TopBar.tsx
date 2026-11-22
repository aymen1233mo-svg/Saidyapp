import React, { useState } from 'react';
import { useLocation } from 'wouter';
import {
  ShoppingCart,
  Heart,
  User,
  Search,
  Menu as MenuIcon,
  ArrowRight,
  ArrowLeft,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useUiSettings } from '@/context/UiSettingsContext';
import { CustomerNotificationsPanel } from './CustomerNotificationsPanel';

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
    <header className="sticky top-0 z-50">
      {/* Desktop Header */}
      <div className="hidden md:block bg-gradient-to-b from-[#DCEBFF] via-[#EEF5FF] to-white border-b border-blue-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-1 bg-gradient-to-l from-[#0B5ED7] via-[#FF6B00] to-transparent" />
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-6">
          <button
            type="button"
            className="cursor-pointer shrink-0 flex items-center gap-3 group text-right"
            onClick={() => setLocation('/')}
            data-testid="link-home-logo"
          >
            {settingsLoading ? (
              <div className="h-11 w-24 bg-blue-100 animate-pulse rounded-xl" />
            ) : (
              <img
                src={logoUrl}
                alt={appName}
                className="h-11 w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-[0_4px_10px_rgba(11,94,215,0.18)]"
              />
            )}
            <div className="flex flex-col leading-none">
              <span className="text-lg font-black text-[#0B5ED7] tracking-tight whitespace-nowrap">{appName}</span>
              <span className="text-[11px] font-bold text-[#FF6B00] mt-1 whitespace-nowrap">{appSubtitle}</span>
            </div>
          </button>

          <div className="flex-1 max-w-xl">
            <form onSubmit={handleSearch} className="relative">
              <Input
                className="w-full pr-11 pl-4 h-10 bg-white border border-blue-200/80 focus:border-[#0B5ED7] focus:ring-2 focus:ring-blue-100 rounded-full shadow-sm transition-all text-sm font-semibold text-slate-800 placeholder-slate-400"
                placeholder={t('search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="submit"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#0B5ED7] hover:text-[#FF6B00] transition-colors"
                aria-label="search"
              >
                <Search className="h-[18px] w-[18px]" />
              </button>
            </form>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <CustomerNotificationsPanel lightVariant />

            <button
              type="button"
              onClick={() => setLocation(user ? '/profile' : '/auth')}
              className="h-10 w-10 flex items-center justify-center bg-white hover:bg-blue-50 border border-blue-100 rounded-full text-[#0B5ED7] transition-all active:scale-95 shadow-sm"
              aria-label="profile"
            >
              <User className="h-[18px] w-[18px]" />
            </button>

            <button
              type="button"
              onClick={() => setLocation('/favorites')}
              className="h-10 w-10 flex items-center justify-center bg-white hover:bg-blue-50 border border-blue-100 rounded-full text-[#0B5ED7] transition-all active:scale-95 shadow-sm"
              aria-label="favorites"
            >
              <Heart className="h-[18px] w-[18px]" />
            </button>

            <button
              type="button"
              onClick={handleOpenCart}
              className="flex items-center gap-2 px-4 h-10 bg-gradient-to-r from-[#0B5ED7] to-[#0046B8] hover:from-[#0A53BE] hover:to-[#003B99] text-white rounded-full transition-all active:scale-95 shadow-sm whitespace-nowrap"
              aria-label="cart"
            >
              <ShoppingCart className="h-[18px] w-[18px]" />
              <span className="text-xs font-black">{t('cart')}</span>
              {getItemCount() > 0 && (
                <span className="bg-[#FF6B00] text-white text-[10px] rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center font-black border border-white tabular-nums">
                  {getItemCount()}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Header matching Al-Saidi mockups 800a7534 & e7cf083a */}
      <div className="md:hidden relative bg-gradient-to-b from-[#D7E9FF] via-[#EBF4FF] to-white border-b border-blue-100/80 shadow-sm overflow-hidden">
        {/* Top-left sky/royal-blue swoosh */}
        <svg
          viewBox="0 0 220 40"
          className="absolute top-0 left-0 w-32 h-auto pointer-events-none opacity-85"
          preserveAspectRatio="none"
        >
          <path d="M0 0 H185 C135 20 65 32 0 36 Z" fill="#0B5ED7" />
          <path d="M0 33 C65 29 135 18 185 0 H198 C142 22 70 35 0 40 Z" fill="#FF6B00" />
        </svg>

        <div className="relative px-3.5 py-2 flex items-center justify-between gap-2 h-14">
          {/* Leading (RTL right): Menu / Back */}
          <div className="flex items-center gap-1.5 min-w-[82px]">
            {isSubPage ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-[#0B5ED7] bg-white hover:bg-blue-50 border border-blue-100 shrink-0 rounded-full shadow-sm active:scale-95 transition-transform"
                onClick={() => window.history.length > 1 ? window.history.back() : setLocation('/')}
                aria-label="back"
              >
                {language === 'ar' ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-[#0B5ED7] bg-white hover:bg-blue-50 border border-blue-100 shrink-0 rounded-full shadow-sm active:scale-95 transition-transform"
                onClick={() => document.getElementById('sidebar-trigger')?.click()}
                aria-label="menu"
              >
                <MenuIcon className="h-5 w-5" />
              </Button>
            )}
            <button
              type="button"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="h-10 w-10 flex items-center justify-center text-[#0B5ED7] bg-white hover:bg-blue-50 border border-blue-100 rounded-full shadow-sm transition-all active:scale-95"
              aria-label="search"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>
          </div>

          {/* Center: Glossy Al-Saidi Logo */}
          <button
            type="button"
            className="flex-1 flex items-center justify-center cursor-pointer"
            onClick={() => setLocation('/')}
            data-testid="link-home-logo-mobile"
          >
            {settingsLoading ? (
              <div className="h-9 w-24 bg-blue-100 animate-pulse rounded-xl" />
            ) : (
              <img
                src={logoUrl}
                alt={appName}
                className="h-10 w-auto max-w-[136px] object-contain drop-shadow-[0_3px_8px_rgba(11,94,215,0.2)]"
              />
            )}
          </button>

          {/* Trailing (RTL left): Notifications Bell + Settings/Cart */}
          <div className="flex items-center justify-end gap-1.5 min-w-[82px]">
            <CustomerNotificationsPanel lightVariant />
            {getItemCount() > 0 ? (
              <button
                type="button"
                onClick={handleOpenCart}
                className="h-10 w-10 flex items-center justify-center text-white bg-gradient-to-br from-[#0B5ED7] to-[#0046B8] rounded-full transition-all active:scale-95 relative shadow-sm"
                aria-label="cart"
              >
                <ShoppingCart className="h-[18px] w-[18px]" />
                <span className="absolute -top-1 -right-1 bg-[#FF6B00] text-white text-[10px] rounded-full h-[18px] min-w-[18px] px-1 flex items-center justify-center font-black border-2 border-white tabular-nums">
                  {getItemCount()}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setLocation('/settings')}
                className="h-10 w-10 flex items-center justify-center text-[#0B5ED7] bg-white hover:bg-blue-50 border border-blue-100 rounded-full shadow-sm transition-all active:scale-95"
                aria-label="settings"
              >
                <SlidersHorizontal className="h-[18px] w-[18px]" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Expandable Search Bar */}
        {isSearchOpen && (
          <div className="relative px-3.5 pb-3 pt-1">
            <form onSubmit={handleSearch} className="relative">
              <input
                autoFocus
                className="w-full bg-white text-slate-900 placeholder-slate-400 border border-blue-200 rounded-full px-4 py-2 pr-11 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B5ED7] shadow-sm"
                placeholder={t('search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-[#0B5ED7] to-[#0046B8] text-white flex items-center justify-center shadow"
                aria-label="submit search"
              >
                <Search className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
};

export default TopBar;
