import React, { useEffect, useState } from 'react';
import { useUiSettings } from '@/context/UiSettingsContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft, MapPin, User } from 'lucide-react';
import { prefetchBootstrap } from '@/lib/bootstrap';

interface SplashScreenProps {
  onFinish: (action: 'guest' | 'login') => void;
}

const LOADING_DURATION_MS = 2200;
const MAX_BOOTSTRAP_MS = 1800;

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const { getSetting } = useUiSettings();
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(18);
  const [bootFinished, setBootFinished] = useState(false);

  const logoUrl = getSetting('splash_image_url') || getSetting('logo_url') || '/assets/saidi-logo.png';
  const courierHeroUrl = getSetting('splash_image_url_2') || '/assets/saidi-courier-hero.jpg';
  const splashTitle = getSetting('splash_title') || 'الصايدي توصيل';
  const splashSubtitle = getSetting('splash_subtitle') || 'سرعة في التوصيل.. ثقة في التعامل.';
  const buttonText = getSetting('splash_button_text') || 'ابدأ الآن';

  // Preload images immediately on mount
  useEffect(() => {
    [logoUrl, courierHeroUrl].forEach((src) => {
      if (src) {
        const img = new Image();
        img.src = src;
      }
    });
  }, [logoUrl, courierHeroUrl]);

  // Pre-warm app data while user is on steps 1 & 2
  useEffect(() => {
    let cancelled = false;
    const phone = user?.phone || localStorage.getItem('customer_phone') || '';
    const customerId = user?.id || '';

    const bootPromise = prefetchBootstrap({ phone, customerId, force: true });
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, MAX_BOOTSTRAP_MS));

    Promise.race([bootPromise, timeoutPromise]).finally(() => {
      if (!cancelled) {
        setBootFinished(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.phone]);

  // Step 2 animated progress & automatic transition to Step 3
  useEffect(() => {
    if (step !== 2) return;

    setProgress(22);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (bootFinished && prev >= 92) return 100;
        if (prev >= 88) return prev;
        return Math.min(bootFinished ? 100 : 88, prev + 8);
      });
    }, 140);

    const advanceTimer = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setStep(3);
      }, 260);
    }, LOADING_DURATION_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(advanceTimer);
    };
  }, [step, bootFinished]);

  const completeFlow = (action: 'guest' | 'login') => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      onFinish(action);
    }, 320);
  };

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

  const BrandLockup = () => (
    <div className="relative flex flex-col items-center splash-logo-enter">
      <div className="relative flex items-center justify-center">
        <img
          src={logoUrl}
          alt={splashTitle}
          className="h-28 sm:h-36 w-auto object-contain drop-shadow-[0_12px_24px_rgba(11,94,215,0.22)]"
          data-testid="img-splash-logo"
        />
        <div className="absolute -top-1.5 -left-1 w-9 h-9 rounded-full bg-gradient-to-br from-[#FF8A00] to-[#FF5500] text-white flex items-center justify-center shadow-lg border-2 border-white">
          <MapPin className="h-4.5 w-4.5 fill-white/25" />
        </div>
      </div>

      <h1 className="sr-only" data-testid="text-splash-title">
        {splashTitle}
      </h1>

      <div className="mt-2 flex flex-col items-center">
        <div className="px-5 sm:px-6 py-2 rounded-full bg-gradient-to-r from-[#003B99] via-[#0B5ED7] to-[#003B99] text-white text-sm sm:text-base font-extrabold shadow-[0_10px_24px_rgba(11,94,215,0.28)] border border-blue-300/30 whitespace-nowrap">
          {renderTagline()}
        </div>
        <div className="w-44 h-1 mt-1 rounded-full bg-gradient-to-r from-transparent via-[#FF6B00] to-transparent" />
      </div>
    </div>
  );

  return (
    <div
      dir="rtl"
      className={`fixed inset-0 z-[9999] flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#BCE0FF] via-[#E5F2FF] to-[#F7FAFF] transition-opacity duration-300 ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Top atmospheric sky glow + subtle skyline silhouette */}
      <div className="absolute inset-0 splash-bg-mesh pointer-events-none" />

      {/* Top-left royal blue & orange corner wave (shown cleanly on step 2 & subtle on step 3) */}
      {step === 2 && (
        <svg
          viewBox="0 0 320 120"
          className="absolute top-0 left-0 w-64 sm:w-80 h-auto pointer-events-none select-none z-10"
          preserveAspectRatio="none"
        >
          <path d="M0 0 H245 C185 45 100 72 0 102 Z" fill="url(#splashTopBlue)" />
          <path d="M0 95 C95 66 180 40 240 0 H262 C192 52 108 82 0 112 Z" fill="#FF6B00" />
          <defs>
            <linearGradient id="splashTopBlue" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#003B99" />
              <stop offset="100%" stopColor="#0B5ED7" />
            </linearGradient>
          </defs>
        </svg>
      )}

      {/* Subtle architectural skyline background */}
      <svg
        viewBox="0 0 800 180"
        className="absolute bottom-36 inset-x-0 w-full h-36 opacity-20 pointer-events-none text-[#7CB5EC]"
        preserveAspectRatio="none"
      >
        <path
          fill="currentColor"
          d="M0,180 L0,120 L35,120 L35,90 L70,90 L70,130 L110,130 L110,75 L155,75 L155,140 L210,140 L210,60 L255,60 L255,115 L310,115 L310,95 L370,95 L370,135 L430,135 L430,68 L485,68 L485,125 L545,125 L545,82 L605,82 L605,130 L670,130 L670,72 L725,72 L725,118 L770,118 L770,95 L800,95 L800,180 Z"
        />
      </svg>

      {/* Main Centered Brand + Courier Visual */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 pt-6 pb-2 max-w-md mx-auto w-full">
        <BrandLockup />

        {/* Courier Artwork Section tailored per step */}
        <div className="relative mt-5 w-full max-w-[330px] sm:max-w-[360px] splash-text-enter">
          {/* Step 3 dashed route path leading to floating orange destination pin */}
          {step === 3 && (
            <div className="relative mb-1">
              <svg
                viewBox="0 0 260 64"
                className="w-full h-14 overflow-visible pointer-events-none"
              >
                <path
                  d="M45,56 Q130,36 205,22"
                  fill="none"
                  stroke="#0B5ED7"
                  strokeWidth="3"
                  strokeDasharray="7 6"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute -top-2 left-6 w-10 h-10 rounded-full bg-gradient-to-br from-[#FF8A00] to-[#FF5500] text-white flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
                <MapPin className="h-5 w-5 fill-white/25" />
              </div>
            </div>
          )}

          <div className="relative rounded-[32px] overflow-hidden shadow-[0_22px_48px_rgba(11,94,215,0.18)] border-2 border-white bg-white">
            <img
              src={courierHeroUrl}
              alt="كابتن الصايدي توصيل"
              className={`w-full object-cover object-center transition-all duration-500 ${
                step === 3 ? 'h-44 sm:h-52' : 'h-52 sm:h-60'
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#003B99]/20 via-transparent to-transparent pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Bottom Interactive Card / Swoosh Matching Exact Reference Step */}
      {step === 1 && (
        <div className="relative z-10 w-full bg-white rounded-t-[42px] shadow-[0_-12px_36px_rgba(11,94,215,0.12)] px-6 pt-7 pb-7 overflow-hidden">
          {/* Dual blue & orange curved swoosh rim */}
          <svg
            viewBox="0 0 400 28"
            className="absolute top-0 left-0 right-0 w-full h-7 pointer-events-none"
            preserveAspectRatio="none"
          >
            <path d="M0,0 L400,0 L400,12 Q210,28 0,8 Z" fill="#0B5ED7" />
            <path d="M0,6 Q210,25 400,10 L400,16 Q210,30 0,12 Z" fill="#FF6B00" />
          </svg>

          <div className="relative max-w-sm mx-auto flex flex-col items-center gap-4 pt-2 splash-button-enter">
            <Button
              type="button"
              onClick={() => setStep(2)}
              data-testid="button-onboarding-start"
              className="w-full h-14 rounded-full bg-gradient-to-r from-[#0046B8] via-[#0B5ED7] to-[#1A73E8] hover:brightness-105 text-white font-black text-lg shadow-[0_12px_28px_rgba(11,94,215,0.34)] flex items-center justify-between px-4 transition-all active:scale-[0.98]"
            >
              <span className="w-8" />
              <span>{buttonText}</span>
              <span className="w-9 h-9 rounded-full bg-white text-[#0B5ED7] flex items-center justify-center shadow-sm">
                <ChevronLeft className="h-5 w-5 stroke-[2.8]" />
              </span>
            </Button>

            {/* 3 Pagination Dots (center dot orange as in reference) */}
            <div className="flex items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                aria-label="الخطوة 1"
                onClick={() => setStep(1)}
                className="w-3 h-3 rounded-full bg-slate-300 transition-colors"
              />
              <button
                type="button"
                aria-label="الخطوة 2"
                onClick={() => setStep(2)}
                className="w-3.5 h-3.5 rounded-full bg-[#FF6B00] shadow-xs transition-transform scale-110"
              />
              <button
                type="button"
                aria-label="الخطوة 3"
                onClick={() => setStep(3)}
                className="w-3 h-3 rounded-full bg-slate-300 transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="relative z-10 w-full bg-white rounded-t-[42px] border-t-[5px] border-[#0B5ED7] shadow-[0_-14px_40px_rgba(11,94,215,0.14)] px-6 pt-6 pb-8 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0B5ED7] via-[#FF6B00] to-[#0B5ED7]" />

          {/* Faint street map grid & pins matching Step 2 screenshot */}
          <svg
            viewBox="0 0 400 130"
            className="absolute inset-0 w-full h-full opacity-35 pointer-events-none"
            preserveAspectRatio="none"
          >
            <path d="M0 30 L400 95 M0 90 L400 20 M110 0 L150 130 M280 0 L240 130" stroke="#BFDBFE" strokeWidth="1.5" fill="none" />
            <circle cx="48" cy="78" r="10" fill="#DBEAFE" />
            <circle cx="352" cy="58" r="12" fill="#DBEAFE" />
          </svg>

          <div className="relative max-w-sm mx-auto text-center space-y-3.5 splash-button-enter">
            <div className="flex items-center justify-center gap-3">
              <span className="h-[2px] w-10 rounded-full bg-gradient-to-l from-[#FF6B00] to-transparent" />
              <p className="text-lg sm:text-xl font-black text-[#0B5ED7] leading-tight">
                مرحباً بك في {splashTitle}
              </p>
              <span className="h-[2px] w-10 rounded-full bg-gradient-to-r from-[#FF6B00] to-transparent" />
            </div>

            <div className="space-y-2 pt-1">
              <div className="w-full h-4.5 rounded-full bg-[#E6EFFD] overflow-hidden p-0.5 shadow-inner border border-blue-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#0B5ED7] to-[#1D74F5] saidi-progress-stripes transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs sm:text-sm font-extrabold text-[#0B5ED7]">
                جاري التحميل...
              </p>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="relative z-10 w-full px-6 pt-2 pb-10 overflow-hidden">
          <div className="relative z-10 max-w-sm mx-auto flex flex-col gap-3 splash-button-enter">
            {/* Primary Orange Action Pill -> Enter App */}
            <Button
              type="button"
              onClick={() => completeFlow('guest')}
              data-testid="button-splash-start"
              className="w-full h-14 rounded-full bg-gradient-to-r from-[#FF9800] via-[#FF7300] to-[#FF5500] hover:brightness-105 text-white font-black text-lg shadow-[0_12px_28px_rgba(255,107,0,0.34)] flex items-center justify-between px-4 transition-all active:scale-[0.98] relative overflow-hidden"
            >
              <span className="w-8" />
              <span className="relative z-10">{buttonText}</span>
              <span className="relative z-10 w-9 h-9 rounded-full bg-white text-[#FF6B00] flex items-center justify-center shadow-sm">
                <ChevronLeft className="h-5 w-5 stroke-[2.8]" />
              </span>
              <span className="absolute inset-0 splash-shimmer" />
            </Button>

            {/* Secondary Outlined Login Pill -> /auth */}
            <Button
              type="button"
              variant="outline"
              onClick={() => completeFlow('login')}
              data-testid="button-splash-login"
              className="w-full h-13 rounded-full bg-white border-2 border-[#0B5ED7] text-[#0B5ED7] hover:bg-blue-50 font-black text-base shadow-sm flex items-center justify-between px-5 transition-all active:scale-[0.98]"
            >
              <span className="w-8 h-8 rounded-full bg-blue-50 text-[#0B5ED7] flex items-center justify-center">
                <User className="h-4.5 w-4.5" />
              </span>
              <span>تسجيل الدخول</span>
              <span className="w-8" />
            </Button>
          </div>

          {/* Bottom Royal Blue & Orange Swoosh Wave matching Screen 3 */}
          <svg
            viewBox="0 0 400 44"
            className="absolute bottom-0 left-0 right-0 w-full h-10 pointer-events-none"
            preserveAspectRatio="none"
          >
            <path d="M0,26 Q180,38 400,4 L400,44 L0,44 Z" fill="#0B5ED7" />
            <path d="M0,22 Q190,33 400,0 L400,6 Q190,37 0,27 Z" fill="#FF6B00" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default SplashScreen;
