import { useLocation } from 'wouter';
import { ArrowRight, Shield, Eye, Lock, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';

export default function Privacy() {
  const [, setLocation] = useLocation();

  const { data: uiSettings } = useQuery<any[]>({
    queryKey: ['/api/ui-settings'],
  });

  const getSetting = (key: string, defaultValue: string) => {
    return uiSettings?.find(s => s.key === key)?.value || defaultValue;
  };

  const dynamicPrivacyText = getSetting('privacy_policy_text', '');
  const supportWhatsapp = getSetting('support_whatsapp', '');
  const supportPhone = getSetting('support_phone', '');

  const privacySections = [
    {
      icon: Shield,
      title: 'جمع المعلومات',
      content: [
        'نقوم بجمع المعلومات التي تقدمها لنا عند التسجيل في التطبيق',
        'معلومات الطلبات والمدفوعات لتحسين خدماتنا',
        'معلومات الموقع لتحديد المطاعم والمتاجر القريبة منك',
        'معلومات الاستخدام لتطوير التطبيق وتحسين الأداء',
      ],
    },
    {
      icon: Eye,
      title: 'استخدام المعلومات',
      content: [
        'معالجة وتنفيذ طلباتك بطريقة صحيحة وسريعة',
        'التواصل معك بخصوص حالة الطلبات والتحديثات',
        'تحسين خدماتنا وتطوير مميزات جديدة',
        'إرسال العروض والتحديثات التسويقية (يمكن إلغاء الاشتراك)',
      ],
    },
    {
      icon: Lock,
      title: 'حماية المعلومات',
      content: [
        'نستخدم تقنيات التشفير المتقدمة لحماية بياناتك',
        'جميع المدفوعات تتم عبر منصات آمنة ومعتمدة',
        'الوصول للمعلومات محدود للموظفين المخولين فقط',
        'نقوم بمراجعة أنظمة الأمان بانتظام لضمان الحماية',
      ],
    },
    {
      icon: Phone,
      title: 'مشاركة المعلومات',
      content: [
        'لا نبيع أو نؤجر معلوماتك الشخصية لأطراف ثالثة',
        'نشارك المعلومات مع المتاجر والمطاعم فقط لتنفيذ الطلبات',
        'قد نشارك معلومات محدودة مع مناديب التوصيل لإيصال طلبك',
        'نلتزم بالقوانين المحلية في حالة طلب السلطات المختصة',
      ],
    },
  ];

  const contactInfo = [
    ...(supportPhone ? [{ icon: Phone, label: 'رقم الهاتف', value: supportPhone }] : []),
    ...(supportWhatsapp ? [{ icon: Phone, label: 'واتساب', value: supportWhatsapp }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#F4F8FF] dark:bg-slate-950 pb-24" dir="rtl">
      {/* Curved Al-Saidi Royal Blue Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#0B5ED7] via-[#0046B8] to-[#00338D] text-white px-4 pt-5 pb-10 rounded-b-[32px] shadow-lg border-b-4 border-[#FF6B00]">
        <div className="absolute -left-10 -top-10 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute right-0 bottom-0 w-32 h-32 rounded-full bg-[#FF6B00]/20 blur-2xl pointer-events-none" />

        <div className="max-w-3xl mx-auto relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/profile')}
              data-testid="button-privacy-back"
              className="rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/20"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-xl font-black tracking-tight">سياسة الخصوصية</h2>
              <p className="text-xs text-blue-100 mt-0.5">حماية وأمان بياناتك في الصايدي توصيل</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shadow-inner">
            <Shield className="h-5 w-5 text-[#FF9B42]" />
          </div>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-4 -mt-5 relative z-20 space-y-5">
        {/* Introduction */}
        <Card className="rounded-3xl border border-blue-100/90 dark:border-slate-800 shadow-md bg-white dark:bg-slate-900 overflow-hidden">
          <CardContent className="p-6">
            <div className="text-center mb-5">
              <div className="w-16 h-16 rounded-3xl bg-[#EEF5FF] border border-blue-200 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-9 w-9 text-[#0B5ED7]" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                نحن نحترم خصوصيتك
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {dynamicPrivacyText || `تطبيق الصايدي توصيل ملتزم بحماية خصوصيتك وأمان معلوماتك الشخصية. هذه السياسة توضح كيفية جمع واستخدام وحماية بياناتك.`}
              </p>
            </div>

            <div className="bg-[#EEF5FF] dark:bg-slate-800 border border-blue-100 dark:border-slate-700 p-4 rounded-2xl">
              <p className="text-sm text-slate-800 dark:text-slate-100">
                <strong className="text-[#0B5ED7]">آخر تحديث:</strong> 1 سبتمبر 2025
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                قد تتغير هذه السياسة من وقت لآخر، وسنقوم بإشعارك بأي تغييرات مهمة.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Sections */}
        {privacySections.map((section, index) => {
          const Icon = section.icon;
          return (
            <Card key={index} className="rounded-3xl border border-blue-100/90 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
              <CardHeader className="pb-2 border-b border-blue-50 dark:border-slate-800">
                <CardTitle className="flex items-center gap-3 text-base font-extrabold text-slate-900 dark:text-white">
                  <div className="w-9 h-9 rounded-xl bg-[#EEF5FF] text-[#0B5ED7] flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ul className="space-y-3">
                  {section.content.map((item, itemIndex) => (
                    <li
                      key={itemIndex}
                      className="flex items-start gap-3 text-slate-700 dark:text-slate-200"
                      data-testid={`privacy-item-${index}-${itemIndex}`}
                    >
                      <div className="w-2 h-2 bg-[#FF6B00] rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}

        {/* User Rights */}
        <Card className="rounded-3xl border border-blue-100/90 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white">حقوقك</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800">
              <h4 className="font-bold text-emerald-800 dark:text-emerald-200 mb-2">
                يحق لك:
              </h4>
              <ul className="space-y-2 text-sm text-emerald-700 dark:text-emerald-300">
                <li>• الوصول إلى معلوماتك الشخصية وتحديثها</li>
                <li>• طلب حذف حسابك ومعلوماتك</li>
                <li>• إلغاء الاشتراك في الإشعارات التسويقية</li>
                <li>• تقديم شكوى حول استخدام معلوماتك</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        {contactInfo.length > 0 && (
          <Card className="rounded-3xl border border-blue-100/90 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white">تواصل معنا</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                إذا كان لديك أي أسئلة حول سياسة الخصوصية أو كيفية معالجة بياناتك،
                يمكنك التواصل معنا عبر:
              </p>

              <div className="space-y-3">
                {contactInfo.map((contact, index) => {
                  const Icon = contact.icon;
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3.5 bg-[#F4F8FF] dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-2xl"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#0B5ED7] text-white flex items-center justify-center">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{contact.label}</p>
                        <p className="text-slate-900 dark:text-white font-bold dir-ltr" data-testid={`contact-${index}`}>
                          {contact.value}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Acceptance */}
        <Card className="rounded-3xl border border-blue-100/90 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              باستخدام تطبيق الصايدي توصيل، فإنك توافق على سياسة الخصوصية هذه
              وعلى جمع واستخدام معلوماتك وفقاً للممارسات الموضحة أعلاه.
            </p>
            <Button
              onClick={() => setLocation('/profile')}
              className="rounded-full bg-gradient-to-l from-[#0B5ED7] to-[#003B99] hover:from-[#0a53c2] hover:to-[#002f7a] text-white font-bold px-8 h-11 shadow-md"
              data-testid="button-accept-privacy"
            >
              فهمت وأوافق
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}