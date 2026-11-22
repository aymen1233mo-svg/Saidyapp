import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import {
  ArrowRight, CreditCard, Banknote, Wallet, Building2,
  AlertCircle, CheckCircle2, Clock, Copy, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

export default function PaymentMethodsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: paymentMethods = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/payment-methods'],
  });

  const { data: walletData } = useQuery<any>({
    queryKey: ['/api/wallet'],
    enabled: !!user,
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "تم النسخ",
      description: `تم نسخ ${label} بنجاح إلى الحافظة`,
    });
  };

  const bankMethods = paymentMethods.filter((m) => m.type === 'bank_transfer' || m.provider === 'bank_transfer');

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
              <h1 className="text-xl font-black tracking-tight">طرق الدفع</h1>
              <p className="text-xs text-blue-100 mt-0.5">إدارة وخيارات الدفع المتاحة في الصايدي توصيل</p>
            </div>
          </div>
          <Badge className="bg-white/15 text-white border border-white/25 rounded-full text-xs px-3 py-1 flex items-center gap-1.5 font-bold shrink-0">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
            آمنة 100%
          </Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 -mt-5 relative z-20 space-y-5">
        {/* Banner Alert for Online Gateways */}
        <Card className="rounded-3xl border border-orange-200 bg-orange-50/95 shadow-md overflow-hidden">
          <CardContent className="p-4 sm:p-5 flex items-start gap-3.5">
            <div className="p-2.5 bg-[#FF6B00] text-white rounded-2xl shrink-0 mt-0.5 shadow-xs">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-orange-950 text-sm">
                تنبيه بشأن الدفع الإلكتروني المباشر
              </h3>
              <p className="text-xs text-orange-900 leading-relaxed">
                حالياً، طرق الدفع الإلكتروني المباشرة (مثل Visa، MasterCard، مدى، Apple Pay) <strong>غير مفعّلة وجاري العمل على تفعيلها وتطويرها قريباً</strong>. يمكنك الاعتماد حالياً على الدفع عند الاستلام، المحفظة الإلكترونية، أو التحويل البنكي المباشر.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 1. Cash On Delivery */}
        <Card className="rounded-3xl shadow-sm border border-blue-100/90 bg-white dark:bg-slate-900 overflow-hidden">
          <CardHeader className="bg-[#EEF5FF]/70 border-b border-blue-100 pb-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500 text-white rounded-2xl shadow-xs">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white">الدفع نقداً عند الاستلام (Cash)</CardTitle>
                  <CardDescription className="text-xs">المسدد عند استلام الطلب من المندوب</CardDescription>
                </div>
              </div>
              <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white rounded-full text-xs font-bold px-3">متاح ومفعّل</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              يمكنك دفع قيمة مشترياتك ورسوم التوصيل نقداً مباشرة لمندوب الصايدي توصيل عند وصول الطلب إلى باب منزلك.
            </p>
            <div className="bg-[#F4F8FF] dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>لا توجد أي رسوم إضافية على خدمة الدفع عند الاستلام.</span>
            </div>
          </CardContent>
        </Card>

        {/* 2. Wallet Payment */}
        <Card className="rounded-3xl shadow-sm border border-blue-100/90 bg-white dark:bg-slate-900 overflow-hidden">
          <CardHeader className="bg-[#EEF5FF]/70 border-b border-blue-100 pb-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#0B5ED7] text-white rounded-2xl shadow-xs">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white">المحفظة الإلكترونية</CardTitle>
                  <CardDescription className="text-xs">رصيدك المباشر في التطبيق</CardDescription>
                </div>
              </div>
              <Badge className="bg-[#0B5ED7] hover:bg-[#0B5ED7] text-white rounded-full text-xs font-bold px-3">متاح</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between p-4 bg-gradient-to-l from-[#EEF5FF] to-[#F4F8FF] border border-blue-200/80 rounded-2xl">
              <div>
                <span className="text-xs text-[#0B5ED7] font-bold">رصيدك الحالي في المحفظة</span>
                <div className="text-2xl font-black text-[#FF6B00] mt-0.5">
                  {walletData?.balance !== undefined ? `${walletData.balance} ريال` : '0 ريال'}
                </div>
              </div>
              <Button
                size="sm"
                className="bg-[#0B5ED7] hover:bg-[#0046B8] text-white font-bold text-xs rounded-full px-4 h-9"
                onClick={() => setLocation('/profile')}
              >
                إدارة المحفظة
              </Button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              يمكنك استخدام رصيد محفظتك لدفع قيمة الطلبات مباشرة وبسرعة فائقة دون الحاجة للكاش.
            </p>
          </CardContent>
        </Card>

        {/* 3. Bank Transfer Methods */}
        <Card className="rounded-3xl shadow-sm border border-blue-100/90 bg-white dark:bg-slate-900 overflow-hidden">
          <CardHeader className="bg-[#EEF5FF]/70 border-b border-blue-100 pb-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#003B99] text-white rounded-2xl shadow-xs">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white">التحويل البنكي المباشر</CardTitle>
                  <CardDescription className="text-xs">بيانات الحسابات البنكية الرسمية للتحويل</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="border-blue-300 text-[#0B5ED7] bg-white rounded-full text-xs font-bold px-3">حسابات رسمية</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            {isLoading ? (
              <div className="text-center py-6 text-xs text-slate-500">جاري تحميل بيانات الحسابات...</div>
            ) : bankMethods.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 bg-[#F4F8FF] rounded-2xl border border-blue-100">
                لا توجد حسابات بنكية مضافة حالياً. يمكنك الاستفسار عبر الدعم الفني.
              </div>
            ) : (
              bankMethods.map((method: any) => (
                <div key={method.id} className="border border-blue-100 rounded-2xl p-4 bg-[#F4F8FF]/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                      <span className="text-base">🏛️</span>
                      {method.nameAr || method.name}
                    </h4>
                    <span className="text-xs text-[#0B5ED7] font-bold">{method.description}</span>
                  </div>

                  {method.documents && method.documents.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {method.documents.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-blue-100 rounded-2xl text-xs">
                          <div>
                            <span className="text-slate-500 font-medium block text-[11px]">{doc.label}</span>
                            <span className="font-mono font-bold text-slate-900 dir-ltr inline-block select-all">{doc.value}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 rounded-full text-[#0B5ED7] hover:text-[#0046B8] hover:bg-[#EEF5FF] gap-1 text-xs font-bold"
                            onClick={() => copyToClipboard(doc.value, doc.label)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                            نسخ
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* 4. Electronic Gateways Under Development */}
        <Card className="rounded-3xl shadow-sm border border-blue-100/90 overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="border-b border-blue-50 pb-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-800 text-white rounded-2xl shadow-xs">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white">بوابات الدفع الإلكتروني (البطاقات)</CardTitle>
                  <CardDescription className="text-xs">مدى، فيزا، ماستركارد، Apple Pay</CardDescription>
                </div>
              </div>
              <Badge className="bg-orange-100 text-[#FF6B00] hover:bg-orange-100 rounded-full font-bold text-xs flex items-center gap-1 px-3">
                <Clock className="h-3 w-3" />
                قريباً
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              {[
                { name: 'مدى (Mada)', icon: '💳' },
                { name: 'Visa / MasterCard', icon: '💳' },
                { name: 'Apple Pay', icon: '🍎' },
                { name: 'محافظ رقمية', icon: '📱' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-[#F4F8FF] border border-blue-100 rounded-2xl opacity-85 flex flex-col items-center justify-center gap-1">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-xs font-bold text-slate-700">{item.name}</span>
                  <span className="text-[10px] text-[#FF6B00] font-bold">قريباً جداً</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 text-center pt-1">
              نعكف حالياً على إتمام إجراءات الربط مع المزودين المحليين لتوفير أفضل وأسرع تجربة دفع إلكتروني آمنة.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
