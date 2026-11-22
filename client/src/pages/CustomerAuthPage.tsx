import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { Loader2, User, UserPlus, Phone, Lock, ArrowRight, ShieldCheck, RefreshCw, KeyRound, CheckCircle2, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CustomerAuthPage() {
  const [, setLocation] = useLocation();
  const { login, register, sendOtp, verifyOtp } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // حالة التحقق برمز OTP
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [demoOtpCode, setDemoOtpCode] = useState('');
  const [otpWhatsappUrl, setOtpWhatsappUrl] = useState('');
  const [otpChannel, setOtpChannel] = useState('whatsapp');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // حالات استعادة كلمة المرور
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotWhatsappUrl, setForgotWhatsappUrl] = useState('');
  const [forgotDemoOtp, setForgotDemoOtp] = useState('');

  const handleStartForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPhone.trim()) {
      setError('يرجى إدخال رقم الهاتف');
      return;
    }
    const phoneError = validateYemeniPhone(forgotPhone);
    if (phoneError) {
      setError(phoneError);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await sendOtp(forgotPhone.trim(), 'reset');
      if (res.success) {
        if (res.whatsappUrl) setForgotWhatsappUrl(res.whatsappUrl);
        if (res.otpCode) {
          setForgotDemoOtp(res.otpCode);
          setForgotOtp(res.otpCode);
        }
        setForgotStep(2);
        toast({ title: 'تم إرسال رمز التحقق', description: 'أدخل الرمز وكلمة المرور الجديدة' });
      } else {
        setError(res.message || 'فشل إرسال رمز التحقق');
      }
    } catch {
      setError('حدث خطأ أثناء إرسال رمز التحقق');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp.trim() || !newPassword) {
      setError('يرجى إدخال رمز التحقق وكلمة المرور الجديدة');
      return;
    }
    if (newPassword.length < 3) {
      setError('كلمة المرور يجب أن لا تقل عن 3 أحرف');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: forgotPhone.trim(), code: forgotOtp.trim(), newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({ title: 'تم تغيير كلمة المرور بنجاح 🎉', description: 'يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة' });
        setShowForgotModal(false);
        setForgotStep(1);
        setForgotPhone('');
        setForgotOtp('');
        setNewPassword('');
      } else {
        setError(data.message || 'فشل تغيير كلمة المرور');
      }
    } catch {
      setError('حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation('/');
    }
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    let timer: any;
    if (showOtpStep && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [showOtpStep, countdown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim()) {
      setError('يرجى إدخال الاسم أو رقم الهاتف');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await login(loginIdentifier.trim(), loginPassword);
      if (result.success) {
        toast({ title: 'تم تسجيل الدخول', description: 'مرحباً بك مجدداً في الصايدي توصيل' });
        setLocation('/');
      } else {
        setError(result.message || 'بيانات الدخول غير صحيحة');
      }
    } catch {
      setError('خطأ في تسجيل الدخول. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  // التحقق من رقم الهاتف اليمني: 9 أرقام يبدأ بـ 77، 78، 71، 70، أو 73
  const validateYemeniPhone = (phone: string): string | null => {
    const normalized = phone
      .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660))
      .replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06F0))
      .replace(/\s+/g, '');
    if (!/^\d{9}$/.test(normalized)) {
      return 'رقم الهاتف يجب أن يتكون من 9 أرقام بالضبط';
    }
    if (!/^(77|78|71|70|73)/.test(normalized)) {
      return 'رقم الهاتف يجب أن يبدأ بـ 77 أو 78 أو 71 أو 70 أو 73';
    }
    return null;
  };

  // 1. طلب إرسال رمز التحقق OTP
  const handleStartRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      setError('يرجى إدخال الاسم بالكامل');
      return;
    }
    if (!regPhone.trim()) {
      setError('يرجى إدخال رقم الهاتف');
      return;
    }
    const phoneError = validateYemeniPhone(regPhone);
    if (phoneError) {
      setError(phoneError);
      return;
    }
    if (!regPassword) {
      setError('يرجى إدخال كلمة المرور');
      return;
    }
    if (regPassword.length < 3) {
      setError('كلمة المرور يجب أن لا تقل عن 3 أحرف');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await sendOtp(regPhone.trim(), 'register');
      if (res.success) {
        if (res.disabled) {
          // إذا كانت ميزة OTP معطلة من لوحة التحكم، إنشاء الحساب فوراً
          const regRes = await register({
            name: regName.trim(),
            phone: regPhone.trim(),
            username: regPhone.trim(),
            password: regPassword,
            userType: 'customer',
          });
          if (regRes.success) {
            toast({
              title: 'تم إنشاء الحساب بنجاح 🎉',
              description: 'أهلاً بك في منصة الصايدي توصيل',
            });
            setLocation('/');
            return;
          } else {
            setError(regRes.message || 'فشل في إنشاء الحساب');
            return;
          }
        }

        if (res.channel) setOtpChannel(res.channel);
        if (res.whatsappUrl) setOtpWhatsappUrl(res.whatsappUrl);
        
        if (res.otpCode) {
          setDemoOtpCode(res.otpCode);
          setOtpCode(res.otpCode); // تعبئة تلقائية للتجربة
        }

        setShowOtpStep(true);
        setCountdown(60);
        setCanResend(false);

        toast({
          title: 'تم إرسال كود التحقق 💬',
          description: 'يرجى إدخال رمز التحقق المكون من 4 أرقام الموضح أدناه للتأكيد.'
        });
      } else {
        setError(res.message || 'فشل في إرسال رمز التحقق');
      }
    } catch {
      setError('حدث خطأ أثناء إرسال رمز التحقق. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  // إعادة إرسال رمز OTP
  const handleResendOtp = async () => {
    if (!canResend) return;
    setLoading(true);
    setError('');
    try {
      const res = await sendOtp(regPhone.trim(), 'register');
      if (res.success) {
        if (res.channel) setOtpChannel(res.channel);
        if (res.whatsappUrl) setOtpWhatsappUrl(res.whatsappUrl);
        if (res.otpCode) {
          setDemoOtpCode(res.otpCode);
          setOtpCode(res.otpCode);
        }
        setCountdown(60);
        setCanResend(false);

        toast({
          title: 'تم إعادة إرسال الرمز',
          description: 'تم إرسال رمز تحقق جديد بنجاح'
        });
      } else {
        setError(res.message || 'تعذر إعادة إرسال الرمز');
      }
    } catch {
      setError('حدث خطأ أثناء إعادة إرسال الرمز');
    } finally {
      setLoading(false);
    }
  };

  // 2. التحقق من الرمز وإنشاء الحساب النهائي
  const handleFinalRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 4) {
      setError('يرجى إدخال رمز التحقق المكون من 4 أرقام');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // التحقق أولاً من الرمز عبر API
      const verifyRes = await verifyOtp(regPhone.trim(), otpCode.trim());
      if (!verifyRes.success) {
        setError(verifyRes.message || 'رمز التحقق غير صحيح');
        setLoading(false);
        return;
      }

      // إنشاء الحساب
      const result = await register({
        name: regName.trim(),
        phone: regPhone.trim(),
        password: regPassword,
        username: regName.trim(),
        otpCode: otpCode.trim(),
      });
      if (result.success) {
        toast({ title: 'تم إنشاء الحساب بنجاح', description: 'مرحباً بك في الصايدي توصيل! تم التحقق من رقمك وإنشاء حسابك 🎉' });
        setLocation('/');
      } else {
        setError(result.message || 'فشل في إنشاء الحساب');
      }
    } catch {
      setError('خطأ في إنشاء الحساب. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen saidi-sky-backdrop relative overflow-hidden flex flex-col items-center justify-center p-4 py-8" dir="rtl">
      {/* Al-Saidi Top Left Corner Swoosh Wave */}
      <div className="pointer-events-none fixed top-0 left-0 w-44 h-36 z-0 overflow-hidden">
        <svg viewBox="0 0 220 170" className="w-full h-full" preserveAspectRatio="none">
          <path d="M0,0 L205,0 C140,35 70,85 0,150 Z" fill="#0B5ED7" />
          <path d="M0,122 C65,72 130,30 198,0 L215,0 C142,40 72,88 0,145 Z" fill="#FF6B00" />
        </svg>
      </div>

      {/* Al-Saidi Bottom Swoosh Wave */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-12 z-0 overflow-hidden">
        <svg viewBox="0 0 400 40" className="w-full h-full" preserveAspectRatio="none">
          <path d="M0,26 Q180,38 400,6 L400,40 L0,40 Z" fill="#0B5ED7" />
          <path d="M0,23 Q190,34 400,2 L400,8 Q190,38 0,28 Z" fill="#FF6B00" />
        </svg>
      </div>

      {showOnboarding ? (
        /* ── Al-Saidi Onboarding Hero Card (Matches reference welcome mockup) ── */
        <div className="relative z-10 w-full max-w-md flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="relative mb-3">
            <img
              src="/assets/saidi-logo.png"
              alt="الصايدي توصيل"
              className="w-60 sm:w-64 h-auto object-contain drop-shadow-[0_10px_22px_rgba(11,94,215,0.18)]"
            />
          </div>

          <div className="saidi-blue-gradient text-white font-bold text-sm px-6 py-2 rounded-full shadow-lg border border-white/25 mb-5">
            سرعة في التوصيل.. <span className="text-[#FF8C00] font-black">ثقة</span> في التعامل.
          </div>

          <div className="w-full rounded-[2rem] overflow-hidden shadow-xl border-2 border-white bg-white mb-6 relative">
            <img
              src="/assets/saidi-courier-hero.jpg"
              alt="كابتن الصايدي توصيل"
              className="w-full h-56 sm:h-64 object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#003B99]/75 to-transparent flex items-end justify-center pb-3">
              <span className="text-white text-xs font-bold tracking-wide">
                خدمة توصيل ذكية وموثوقة على مدار الساعة
              </span>
            </div>
          </div>

          <div className="w-full space-y-3 px-2">
            <Button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setShowOnboarding(false);
              }}
              className="w-full h-14 rounded-full saidi-orange-gradient hover:brightness-105 text-white font-black text-lg shadow-lg shadow-orange-500/25 flex items-center justify-between px-5 transition-all active:scale-[0.98]"
            >
              <span className="w-8 h-8 rounded-full bg-white text-[#FF6B00] flex items-center justify-center shadow-sm">
                <ArrowRight className="h-4 w-4 rotate-180" />
              </span>
              <span>ابدأ الآن</span>
              <span className="w-8" />
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setActiveTab('login');
                setShowOnboarding(false);
              }}
              className="w-full h-[52px] rounded-full bg-white border-2 border-[#0B5ED7] text-[#0B5ED7] hover:bg-blue-50 font-black text-base shadow-sm flex items-center justify-between px-5 transition-all active:scale-[0.98]"
            >
              <span className="w-8" />
              <span>تسجيل الدخول</span>
              <span className="w-8 h-8 rounded-full bg-blue-50 text-[#0B5ED7] flex items-center justify-center">
                <User className="h-4 w-4" />
              </span>
            </Button>

            <button
              type="button"
              onClick={() => {
                localStorage.setItem('is_guest', 'true');
                window.dispatchEvent(new Event('storage'));
                setLocation('/');
              }}
              className="w-full py-2.5 text-sm font-bold text-[#003B99]/80 hover:text-[#0B5ED7] transition-colors"
            >
              تصفح التطبيق كزائر ←
            </button>
          </div>
        </div>
      ) : (
        <div className="relative z-10 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="mb-5 text-center flex flex-col items-center">
            <img
              src="/assets/saidi-logo.png"
              alt="الصايدي توصيل"
              className="w-44 h-auto object-contain mb-2 drop-shadow-md cursor-pointer"
              onClick={() => setShowOnboarding(true)}
            />
            <span className="inline-flex items-center gap-1.5 bg-white/90 border border-blue-100 text-[#003B99] text-xs font-bold px-4 py-1 rounded-full shadow-xs">
              سرعة في التوصيل.. <span className="text-[#FF6B00] font-black">ثقة</span> في التعامل
            </span>
          </div>

          <Card className="w-full border border-blue-100 shadow-2xl shadow-blue-900/10 rounded-[2rem] overflow-hidden bg-white">
            <CardHeader className="space-y-1 bg-gradient-to-b from-[#EEF5FF] to-white pb-6 border-b border-blue-50">
              <div className="flex items-center justify-between mb-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowOnboarding(true)}
                  className="h-10 w-10 rounded-full bg-white shadow-xs border border-blue-100 text-[#0B5ED7] hover:bg-blue-50 transition-colors"
                  title="رجوع"
                >
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <CardTitle className="text-2xl font-black text-[#003B99]">حسابي</CardTitle>
                <button
                  type="button"
                  onClick={() => setLocation('/')}
                  className="text-xs font-bold text-[#0B5ED7] hover:underline"
                >
                  الرئيسية
                </button>
              </div>
              <CardDescription className="text-sm font-medium text-center text-gray-500">
                سجل دخولك أو أنشئ حساباً جديداً لتجربة توصيل سريعة وموثوقة
              </CardDescription>
            </CardHeader>
            <CardContent className="bg-white px-6 sm:px-8 pt-6 pb-8">
              <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setShowOtpStep(false); setError(''); }} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-7 bg-[#EEF5FF] p-1.5 rounded-2xl h-[52px] border border-blue-100">
                  <TabsTrigger
                    value="login"
                    className="rounded-xl data-[state=active]:bg-[#0B5ED7] data-[state=active]:text-white data-[state=active]:shadow-md font-black text-sm transition-all text-[#003B99]"
                  >
                    <User className="w-4 h-4 ml-1.5" />
                    دخول
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="rounded-xl data-[state=active]:bg-[#0B5ED7] data-[state=active]:text-white data-[state=active]:shadow-md font-black text-sm transition-all text-[#003B99]"
                  >
                    <UserPlus className="w-4 h-4 ml-1.5" />
                    حساب جديد
                  </TabsTrigger>
                </TabsList>

                {error && (
                  <Alert variant="destructive" className="mb-5 rounded-2xl border-2">
                    <AlertDescription className="font-bold">{error}</AlertDescription>
                  </Alert>
                )}

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-id" className="font-bold text-[#003B99]">الاسم أو رقم الهاتف</Label>
                      <div className="relative">
                        <User className="absolute right-3.5 top-4 h-5 w-5 text-[#0B5ED7]/60" />
                        <Input
                          id="login-id"
                          value={loginIdentifier}
                          onChange={(e) => setLoginIdentifier(e.target.value)}
                          placeholder="أدخل اسمك أو رقم هاتفك"
                          required
                          className="pr-11 h-[52px] rounded-2xl border-blue-100 bg-[#F9FBFF] focus-visible:ring-[#0B5ED7] focus-visible:border-[#0B5ED7] transition-all text-base"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-pass" className="font-bold text-[#003B99]">كلمة المرور</Label>
                        <button
                          type="button"
                          onClick={() => { setShowForgotModal(true); setError(''); }}
                          className="text-xs font-bold text-[#FF6B00] hover:underline"
                        >
                          نسيت كلمة المرور؟
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute right-3.5 top-4 h-5 w-5 text-[#0B5ED7]/60" />
                        <Input
                          id="login-pass"
                          type="password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="أدخل كلمة المرور"
                          required
                          className="pr-11 h-[52px] rounded-2xl border-blue-100 bg-[#F9FBFF] focus-visible:ring-[#0B5ED7] focus-visible:border-[#0B5ED7] transition-all text-base"
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-[52px] rounded-full font-black text-lg mt-4 saidi-blue-gradient hover:brightness-110 text-white shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                          جاري تسجيل الدخول...
                        </>
                      ) : (
                        'تسجيل الدخول'
                      )}
                    </Button>

                    <div className="pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          localStorage.setItem('is_guest', 'true');
                          window.dispatchEvent(new Event('storage'));
                          setLocation('/');
                        }}
                        className="w-full h-12 rounded-full font-bold text-base border-2 border-blue-200 text-[#0B5ED7] hover:bg-blue-50 transition-all active:scale-95"
                      >
                        الدخول كزائر
                      </Button>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  {!showOtpStep ? (
                    <form onSubmit={handleStartRegister} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reg-name" className="font-bold text-[#003B99]">الاسم بالكامل</Label>
                        <div className="relative">
                          <User className="absolute right-3.5 top-3.5 h-5 w-5 text-[#0B5ED7]/60" />
                          <Input
                            id="reg-name"
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            placeholder="مثال: محمد علي"
                            required
                            className="pr-11 h-[52px] rounded-2xl border-blue-100 bg-[#F9FBFF] focus-visible:ring-[#0B5ED7]"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-phone" className="font-bold text-[#003B99]">رقم الهاتف (الجمهورية اليمنية)</Label>
                        <div className="relative">
                          <Phone className="absolute right-3.5 top-3.5 h-5 w-5 text-[#0B5ED7]/60" />
                          <Input
                            id="reg-phone"
                            type="tel"
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            placeholder="77XXXXXXX"
                            required
                            className="pr-11 h-[52px] rounded-2xl border-blue-100 bg-[#F9FBFF] focus-visible:ring-[#0B5ED7] text-left font-mono"
                            dir="ltr"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-pass" className="font-bold text-[#003B99]">كلمة المرور</Label>
                        <div className="relative">
                          <Lock className="absolute right-3.5 top-3.5 h-5 w-5 text-[#0B5ED7]/60" />
                          <Input
                            id="reg-pass"
                            type="password"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="اختر كلمة مرور"
                            required
                            className="pr-11 h-[52px] rounded-2xl border-blue-100 bg-[#F9FBFF] focus-visible:ring-[#0B5ED7]"
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="w-full h-[52px] rounded-full font-black text-lg mt-4 saidi-orange-gradient hover:brightness-105 text-white shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            جاري إرسال رمز التحقق...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-5 w-5" />
                            إرسال رمز التحقق (OTP)
                          </>
                        )}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleFinalRegister} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center space-y-2">
                        <div className="flex items-center justify-center gap-2 font-black text-[#003B99] text-lg">
                          <ShieldCheck className="w-6 h-6 text-[#0B5ED7]" />
                          التحقق من رقم الهاتف
                        </div>
                        <p className="text-sm font-semibold text-[#0B5ED7] dir-ltr font-mono">
                          +967 {regPhone}
                        </p>

                        {otpWhatsappUrl && (otpChannel === 'whatsapp' || otpChannel === 'both') && (
                          <div className="pt-2">
                            <Button
                              type="button"
                              onClick={() => window.open(otpWhatsappUrl, '_blank')}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full gap-2 h-11"
                            >
                              <MessageCircle className="w-5 h-5 fill-white" />
                              فتح الواتساب لاستلام الكود فوراً
                            </Button>
                          </div>
                        )}

                        {demoOtpCode && (
                          <div className="mt-2 bg-white border border-blue-200 rounded-xl p-2 inline-flex items-center gap-2 text-xs font-bold text-[#003B99]">
                            <KeyRound className="w-4 h-4 text-[#FF6B00]" />
                            رمز التحقق: <span className="font-mono text-base font-black text-[#0B5ED7] tracking-widest">{demoOtpCode}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="otp-input" className="font-bold text-base block text-center text-[#003B99]">
                          أدخل رمز التحقق المكون من 4 أرقام:
                        </Label>

                        <div className="flex items-center justify-center gap-3 dir-ltr">
                          {[0, 1, 2, 3].map((index) => {
                            const digit = otpCode[index] || '';
                            return (
                              <input
                                key={index}
                                id={`otp-box-${index}`}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, '');
                                  const currentOtp = otpCode.split('');
                                  currentOtp[index] = val;
                                  const newOtp = currentOtp.join('').slice(0, 4);
                                  setOtpCode(newOtp);

                                  if (val && index < 3) {
                                    const nextInput = document.getElementById(`otp-box-${index + 1}`);
                                    nextInput?.focus();
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
                                    const prevInput = document.getElementById(`otp-box-${index - 1}`);
                                    prevInput?.focus();
                                  }
                                }}
                                className="w-14 h-16 rounded-2xl border-2 border-[#0B5ED7] bg-[#F4F8FF] text-center text-3xl font-black font-mono text-[#003B99] focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:bg-white shadow-sm transition-all"
                                autoFocus={index === 0}
                              />
                            );
                          })}
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-[52px] rounded-full font-black text-lg saidi-orange-gradient hover:brightness-105 text-white shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            جاري التحقق وإنشاء الحساب...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-5 w-5" />
                            تأكيد وإنشاء الحساب
                          </>
                        )}
                      </Button>

                      <div className="flex items-center justify-between pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setShowOtpStep(false)}
                          className="text-sm font-bold text-gray-500 hover:text-gray-800"
                        >
                          تعديل رقم الهاتف
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          disabled={!canResend || loading}
                          onClick={handleResendOtp}
                          className="text-sm font-bold rounded-full border-blue-200 text-[#0B5ED7] gap-1.5"
                        >
                          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                          {canResend ? 'إعادة إرسال الرمز' : `إعادة الإرسال (${countdown}ث)`}
                        </Button>
                      </div>
                    </form>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <p className="mt-6 text-xs text-gray-500 max-w-xs mx-auto text-center leading-relaxed">
            بتسجيلك في الصايدي توصيل، أنت توافق على شروط الخدمة وسياسة الخصوصية الخاصة بنا.
          </p>
        </div>
      )}

      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl rounded-3xl border border-blue-100">
            <CardHeader className="text-center relative pb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setShowForgotModal(false); setForgotStep(1); setError(''); }}
                className="absolute left-4 top-4 rounded-full"
              >
                ✕
              </Button>
              <div className="mx-auto w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-3 text-[#0B5ED7]">
                <KeyRound className="w-6 h-6" />
              </div>
              <CardTitle className="text-2xl font-black text-[#003B99]">استعادة كلمة المرور</CardTitle>
              <CardDescription>
                {forgotStep === 1 ? 'أدخل رقم هاتفك المسجل لإرسال رمز التحقق' : 'أدخل رمز التحقق وكلمة المرور الجديدة'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {error && (
                <Alert variant="destructive" className="rounded-2xl">
                  <AlertDescription className="font-bold">{error}</AlertDescription>
                </Alert>
              )}

              {forgotStep === 1 ? (
                <form onSubmit={handleStartForgot} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-bold">رقم الهاتف</Label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-4 h-5 w-5 text-gray-400" />
                      <Input
                        type="tel"
                        value={forgotPhone}
                        onChange={(e) => setForgotPhone(e.target.value)}
                        placeholder="770000000"
                        required
                        className="pr-10 h-14 rounded-2xl border-blue-100 text-lg"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-[52px] rounded-full font-black text-lg saidi-blue-gradient text-white"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'إرسال رمز التحقق'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleFinishForgot} className="space-y-4">
                  {forgotWhatsappUrl && (
                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800">رابط إرسال الكود عبر واتساب:</span>
                      <a
                        href={forgotWhatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-black bg-emerald-600 text-white px-3 py-1.5 rounded-xl flex items-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> فتح واتساب
                      </a>
                    </div>
                  )}
                  {forgotDemoOtp && (
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-center">
                      <p className="text-xs text-amber-800 font-bold">رمز التحقق التجريبي:</p>
                      <p className="text-lg font-black text-amber-900 tracking-widest">{forgotDemoOtp}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="font-bold">رمز التحقق (OTP)</Label>
                    <Input
                      type="text"
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                      placeholder="1234"
                      required
                      className="h-14 rounded-2xl text-center text-xl tracking-widest border-blue-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold">كلمة المرور الجديدة</Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-4 h-5 w-5 text-gray-400" />
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="أدخل كلمة المرور الجديدة"
                        required
                        className="pr-10 h-14 rounded-2xl border-blue-100 text-lg"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-[52px] rounded-full font-black text-lg saidi-blue-gradient text-white"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'تأكيد وتغيير كلمة المرور'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

