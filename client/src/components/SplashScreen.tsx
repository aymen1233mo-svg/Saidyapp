import React, { useEffect, useMemo, useState } from 'react';
import { useUiSettings } from '@/context/UiSettingsContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft, MapPin } from 'lucide-react';
import { prefetchBootstrap } from '@/lib/bootstrap';

interface SplashScreenProps {
  onFinish: () => void;
}

const DEFAULT_SPLASH_DURATION_MS = 3000;
const MIN_SPLASH_DURATION_MS = 2400;
const MAX_BOOTSTRAP_MS = 2000;

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const { getSetting } = useUiSettings();
  const { user } = useAuth();
  const [isExiting, setIsExiting] = useState(false);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(18);
  const [logoLoaded, setLogoLoaded] = useState(false);

  const splashDurationMs = useMemo(() => {
    const rawDuration = getSetting('splash_duration');
    if (!rawDuration) return DEFAULT_SPLASH_DURATION_MS;
    const parsed = parseFloat(rawDuration);
    if (isNaN(parsed) || parsed <= 0) return DEFAULT_SPLASH_DURATION_MS;
    const inMs = parsed < 100 ? parsed * 1000 : parsed;
    return Math.max(MIN_SPLASH_DURATION_MS, inMs);
  }, [getSetting]);

  const splashImageUrl = getSetting('splash_image_url');
  const splashImageUrl2 = getSetting('splash_image_url_2');
  const logoUrl = splashImageUrl || getSetting('logo_url') || '/assets/saidi-logo.png';
  const courierHeroUrl = splashImageUrl2 || '/assets/saidi-courier-hero.jpg';
  const splashTitle = getSetting('splash_title') || 'الصايدي توصيل';
  const splashSubtitle = getSetting('splash_subtitle') || 'سرعة في التوصيل.. ثقة في التعامل.';
  const buttonText = getSetting('splash_button_text') || 'ابدأ الآن';

  useEffect(() => {
    [logoUrl, courierHeroUrl].forEach((src) => {
      if (src) {
        const img = new Image();
        img.src = src;
      }
    });
  }, [logoUrl, courierHeroUrl]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (ready) return 100;
        if (prev >= 88) return prev;
        return Math.min(88, prev + 9);
      });
    }, 180);
    return () => clearInterval(interval);
  }, [ready]);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    const phone = user?.phone || localStorage.getItem('customer_phone') || '';
    const customerId = user?.id || '';

    const bootPromise = prefetchBootstrap({ phone, customerId, force: true });
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, MAX_BOOTSTRAP_MS));

    Promise.race([bootPromise, timeoutPromise]).finally(() => {
      const elapsed = Date.now() - startedAt;
      const readyDelay = Math.max(0, 750 - elapsed);
      setTimeout(() => {
        if (!cancelled) {
          setReady(true);
          setProgress(100);
        }
      }, readyDelay);
    });

    const autoFinishTimer = setTimeout(() => {
      if (!cancelled) {
        setIsExiting(true);
        setTimeout(() => {
          if (!cancelled) {
            onFinish();
          }
        }, 500);
      }
    }, splashDurationMs);

    return () => {
      cancelled = true;
      clearTimeout(autoFinishTimer);
    };
  }, [user?.id, user?.phone, onFinish, splashDurationMs]);

  const handleStart = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(onFinish, 450);
  };

  // Highlight the word "ثقة" in vibrant orange if default tagline is active
  const renderTagline = () => {
    if (splashSubtitle.includes('ثقة')) {
      const parts = splashSubtitle.split('ثقة');
      return (
        <>
          {parts[0]}
          <span className="text-[#FF8A00] font-black">ثقة</span>
          {parts.slice(1).join('ثقة')}
        </>
      );
    }
    return splashSubtitle;
  };

  return (
    <div
      dir="rtl"
      className={`fixed inset-0 z-[9999] flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#DCEBFF] via-[#EEF5FF] to-white transition-opacity duration-500 ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Top-left royal blue & vibrant orange swoosh wave */}
      <svg
        viewBox="0 0 360 140"
        className="absolute top-0 left-0 w-72 md:w-96 h-auto pointer-events-none select-none z-0"
        preserveAspectRatio="none"
      >
        <path
          d="M0 0 H280 C210 55 110 80 0 118 Z"
          fill="url(#saidiSplashTopBlue)"
        />
        <path
          d="M0 108 C105 72 200 48 270 0 H292 C215 62 118 92 0 128 Z"
          fill="#FF6B00"
        />
        <defs>
          <linearGradient id="saidiSplashTopBlue" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#003B99" />
            <stop offset="100%" stopColor="#0B5ED7" />
          </linearGradient>
        </defs>
      </svg>

      {/* Soft sky radial glow */}
      <div className="absolute inset-0 splash-bg-mesh pointer-events-none" />

      {/* Center brand + hero visual */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 pt-8 pb-2 max-w-lg mx-auto w-full">
        {/* Logo + orange location pin accent */}
        <div className="relative splash-logo-enter flex flex-col items-center">
          <div className="relative flex items-center justify-center">
            <img
              src={logoUrl}
              onLoad={() => setLogoLoaded(true)}
              alt="الصايدي توصيل - Al-Saidi Delivery"
              className={`h-28 sm:h-36 md:h-40 w-auto object-contain drop-shadow-[0_14px_28px_rgba(11,94,215,0.22)] splash-float transition-opacity duration-300 ${
                logoLoaded ? 'opacity-100' : 'opacity-95'
              }`}
              data-testid="img-splash-logo"
            />
            <div className="absolute -top-2 -left-1 w-9 h-9 rounded-full bg-gradient-to-br from-[#FF8A00] to-[#FF5500] text-white flex items-center justify-center shadow-lg border-2 border-white">
              <MapPin className="h-4.5 w-4.5 fill-white/25" />
            </div>
          </div>

          <h1 className="sr-only" data-testid="text-splash-title">
            {splashTitle}
          </h1>

          {/* Royal blue slogan pill with orange underline swoosh */}
          <div className="mt-2 flex flex-col items-center splash-text-enter">
            <div className="px-5 py-2 rounded-full bg-gradient-to-r from-[#003B99] via-[#0B5ED7] to-[#003B99] text-white text-sm sm:text-base font-extrabold shadow-[0_10px_24px_rgba(11,94,215,0.3)] border border-blue-400/30">
              {renderTagline()}
            </div>
            <div className="w-40 h-1 mt-1 rounded-full bg-gradient-to-r from-transparent via-[#FF6B00] to-transparent" />
          </div>
        </div>

        {/* 3D Courier Illustration Card */}
        <div className="mt-4 sm:mt-6 w-full max-w-[330px] sm:max-w-[380px] splash-text-enter">
          <div className="relative rounded-[32px] overflow-hidden shadow-[0_20px_45px_rgba(11,94,215,0.18)] border-2 border-white/90 bg-gradient-to-b from-[#DCEBFF] to-white">
            <img
              src={courierHeroUrl}
              alt="كابتن الصايدي توصيل"
              className="w-full h-48 sm:h-60 object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white/35 via-transparent to-transparent pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Curved white map-grid bottom welcome card */}
      <div className="relative z-10 w-full bg-white rounded-t-[40px] border-t-[5px] border-[#0B5ED7] shadow-[0_-14px_40px_rgba(11,94,215,0.14)] px-6 pt-5 pb-6 md:pb-8 overflow-hidden">
        {/* Decorative orange curved rim accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0B5ED7] via-[#FF6B00] to-[#0B5ED7]" />

        {/* Subtle light-blue map lines & faint pins */}
        <svg
          viewBox="0 0 400 130"
          className="absolute inset-0 w-full h-full opacity-35 pointer-events-none"
          preserveAspectRatio="none"
        >
          <path d="M0 30 L400 95 M0 90 L400 20 M110 0 L150 130 M280 0 L240 130" stroke="#BFDBFE" strokeWidth="1.5" fill="none" />
          <circle cx="48" cy="78" r="10" fill="#DBEAFE" />
          <circle cx="352" cy="58" r="12" fill="#DBEAFE" />
        </svg>

        <div className="relative max-w-sm mx-auto text-center space-y-3 splash-button-enter">
          <div className="flex items-center justify-center gap-3">
            <span className="h-[2px] w-10 rounded-full bg-gradient-to-l from-[#FF6B00] to-transparent" />
            <p className="text-lg sm:text-xl font-black text-[#0B5ED7] leading-tight">
              مرحباً بك في {splashTitle}
            </p>
            <span className="h-[2px] w-10 rounded-full bg-gradient-to-r from-[#FF6B00] to-transparent" />
          </div>

          {!ready ? (
            <div className="space-y-2 pt-1">
              <div className="w-full h-4 rounded-full bg-[#E6EFFD] overflow-hidden p-0.5 shadow-inner border border-blue-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#0B5ED7] to-[#1D74F5] saidi-progress-stripes transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs sm:text-sm font-extrabold text-[#0B5ED7]">
                جاري التحميل...
              </p>
            </div>
          ) : (
            <div className="pt-1">
              <Button
                onClick={handleStart}
                data-testid="button-splash-start"
                className="w-full h-13 sm:h-14 rounded-full text-base sm:text-lg font-black bg-gradient-to-r from-[#FF8A00] via-[#FF6B00] to-[#FF5500] hover:from-[#FF981A] hover:to-[#FF6000] text-white shadow-[0_12px_28px_rgba(255,107,0,0.38)] flex items-center justify-center gap-2.5 active:scale-95 transition-all relative overflow-hidden"
              >
                <span className="relative z-10">{buttonText}</span>
                <ChevronLeft className="h-5 w-5 relative z-10" />
                <span className="absolute inset-0 splash-shimmer" />
              </Button>
            </div>
          )}

          <div className="pt-1 text-[11px] text-slate-400 font-semibold flex flex-col items-center gap-0.5">
            <span>© 2026 {splashTitle} · جميع الحقوق محفوظة</span>
            <a
              href="https://wa.me/967777146387"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0B5ED7]/80 hover:text-[#0B5ED7] font-bold underline underline-offset-2"
            >
              تصميم وبرمجة شركة اتقان سوفت
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
