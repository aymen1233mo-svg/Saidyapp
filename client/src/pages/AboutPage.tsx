import { useLocation } from 'wouter';
import {
  ArrowRight, ShieldCheck, Heart, Sparkles,
  Phone, Mail, MessageCircle, Lock, Info,
  ShoppingBag, Truck, Headphones
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUiSettings } from '@/context/UiSettingsContext';

export default function AboutPage() {
  const [, setLocation] = useLocation();
  const { getSetting } = useUiSettings();

  const appName = getSetting('about_app_name', 'الصايدي توصيل (Al-Saidi Delivery)');
  const appDesc = getSetting('about_app_description', 'التطبيق الرائد والأسرع لتوصيل المطاعم والطلبات والمتاجر والطرود مباشرة إلى باب منزلك بأعلى معايير الجودة والسرعة والثقة في التعامل.');
  const appVersion = getSetting('about_app_version', '1.5.0');
  const appVision = getSetting('about_app_vision', 'أن نكون الخيار الأول والأنسب لكل منزل ومؤسسة في خدمات التوصيل السريع والتسوق المباشر بضمانة وثقة عالية.');
  const appMission = getSetting('about_app_mission', 'تقديم تجربة تسوق وتوصيل سلسة وآمنة، والوصول السريع لطلباتكم مع متابعة لحظية وخدمة عملاء متميزة.');
  const phone = getSetting('about_app_phone', getSetting('support_phone', '770000000'));
  const whatsapp = getSetting('about_app_whatsapp', getSetting('whatsapp_number', '770000000'));
  const email = getSetting('about_app_email', 'support@alsaidi-delivery.com');

  return (
    <div className="min-h-screen bg-[#F4F8FF] dark:bg-slate-950 pb-24 rtl" dir="rtl">
      {/* Curved Al-Saidi Royal Blue Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#0B5ED7] via-[#0046B8] to-[#00338D] text-white px-4 pt-5 pb-10 rounded-b-[32px] shadow-lg border-b-4 border-[#FF6B00]">
        <div className="absolute -left-10 -top-10 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute right-0 bottom-0 w-32 h-32 rounded-full bg-[#FF6B00]/20 blur-2xl pointer-events-none" />

        <div className="max-w-3xl mx-auto relative z-10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/settings')}
              className="rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/20"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-black tracking-tight">حول التطبيق</h1>
              <p className="text-xs text-blue-100 mt-0.5">معلومات وشروط ووسائل التواصل</p>
            </div>
          </div>
          <Badge className="bg-[#FF6B00] hover:bg-[#FF6B00] text-white border-0 rounded-full text-xs px-3 py-1 font-bold shrink-0">
            الإصدار {appVersion}
          </Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 -mt-5 relative z-20 space-y-5">
        {/* App Hero Branding */}
        <Card className="rounded-3xl border border-blue-200/80 shadow-lg bg-gradient-to-br from-[#0B5ED7] via-[#0046B8] to-[#00338D] text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Truck className="w-48 h-48" />
          </div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-[#FF6B00]/30 blur-2xl pointer-events-none" />
          <CardContent className="p-6 relative z-10 text-center space-y-3">
            <div className="w-20 h-20 mx-auto bg-white rounded-3xl flex items-center justify-center p-2 shadow-lg border-2 border-[#FF6B00]/70">
              <img
                src="/assets/saidi-logo.png"
                alt="الصايدي توصيل"
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="text-2xl font-black tracking-tight">{appName}</h2>
            <p className="text-xs sm:text-sm text-blue-50 max-w-lg mx-auto leading-relaxed">
              {appDesc}
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
              <Badge className="bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-full text-[11px] px-3 py-1 font-bold">
                سرعة في التوصيل ⚡
              </Badge>
              <Badge className="bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-full text-[11px] px-3 py-1 font-bold">
                ثقة في التعامل 🛡️
              </Badge>
              <Badge className="bg-[#FF6B00] hover:bg-[#e55f00] text-white border-0 rounded-full text-[11px] px-3 py-1 font-bold">
                توصيل طلبات وطرود 🛵
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Vision & Mission */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="rounded-3xl shadow-sm border border-blue-100/90 bg-white dark:bg-slate-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#FF6B00] flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                رؤيتنا
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{appVision}</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm border border-blue-100/90 bg-white dark:bg-slate-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#EEF5FF] text-[#0B5ED7] flex items-center justify-center">
                  <Heart className="h-4 w-4" />
                </div>
                رسالتنا
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{appMission}</p>
            </CardContent>
          </Card>
        </div>

        {/* Platform Core Features */}
        <Card className="rounded-3xl shadow-sm border border-blue-100/90 bg-white dark:bg-slate-900 overflow-hidden">
          <CardHeader className="pb-3 border-b border-blue-50 bg-[#EEF5FF]/50">
            <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Info className="h-5 w-5 text-[#0B5ED7]" />
              مميزات وخدمات منصة {appName}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {[
              { title: 'تسوق المطاعم والمتاجر', desc: 'تشكيلة واسعة من المطاعم والمتاجر والمواد الغذائية والتمور بأسعار ممتازة.', icon: ShoppingBag, color: 'text-[#FF6B00] bg-orange-50' },
              { title: 'خدمة التوصيل السريع والطرود', desc: 'إرسال واستلام أي أغراض أو طرود شخصية بين الأماكن بسرعة فائقة وأمان.', icon: Truck, color: 'text-[#0B5ED7] bg-[#EEF5FF]' },
              { title: 'تتبع حي لحظة بلحظة', desc: 'متابعة حركة المندوب على الخريطة مع إشعارات فورية حتى وصول طلبك.', icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50' },
              { title: 'دعم فني واستجابة فورية', desc: 'فريق دعم متواجد لخدمتك ومتابعة طلباتك بانتظام.', icon: Headphones, color: 'text-[#0B5ED7] bg-[#EEF5FF]' },
            ].map((feature, idx) => {
              const IconComp = feature.icon;
              return (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl border border-blue-100/70 bg-[#F4F8FF]/60">
                  <div className={`p-2.5 rounded-xl shrink-0 ${feature.color}`}>
                    <IconComp className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">{feature.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Contact & Support */}
        <Card className="rounded-3xl shadow-sm border border-blue-100/90 bg-white dark:bg-slate-900 overflow-hidden">
          <CardHeader className="pb-3 border-b border-blue-50">
            <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Headphones className="h-5 w-5 text-[#0B5ED7]" />
              تواصل مع الدعم الفني
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-2.5 p-3.5 rounded-2xl border border-blue-100 bg-[#F4F8FF]/60 hover:border-[#0B5ED7] hover:bg-[#EEF5FF] transition-all text-xs font-medium text-slate-800"
              >
                <div className="p-2 bg-[#0B5ED7] text-white rounded-xl">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500">الاتصال المباشر</span>
                  <span className="font-bold dir-ltr">{phone}</span>
                </div>
              </a>

              <a
                href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 p-3.5 rounded-2xl border border-emerald-100 bg-emerald-50/40 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-xs font-medium text-slate-800"
              >
                <div className="p-2 bg-emerald-600 text-white rounded-xl">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500">واتساب الدعم</span>
                  <span className="font-bold dir-ltr">{whatsapp}</span>
                </div>
              </a>

              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2.5 p-3.5 rounded-2xl border border-orange-100 bg-orange-50/40 hover:border-[#FF6B00] hover:bg-orange-50 transition-all text-xs font-medium text-slate-800"
              >
                <div className="p-2 bg-[#FF6B00] text-white rounded-xl">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500">البريد الإلكتروني</span>
                  <span className="font-bold truncate max-w-[130px] inline-block">{email}</span>
                </div>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Legal & Terms Quick Links */}
        <Card className="rounded-3xl shadow-sm border border-blue-100/90 bg-white dark:bg-slate-900">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-200">
              <div className="w-8 h-8 rounded-xl bg-[#EEF5FF] text-[#0B5ED7] flex items-center justify-center">
                <Lock className="h-4 w-4" />
              </div>
              <span>سياسة الخصوصية والشروط والأحكام</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation('/privacy')}
              className="rounded-full text-xs font-bold text-[#0B5ED7] border-blue-200 hover:bg-[#EEF5FF] px-4"
            >
              عرض التفاصيل
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-slate-500 pt-2">
          جميع الحقوق محفوظة © {new Date().getFullYear()} {appName}
        </p>
      </main>
    </div>
  );
}
