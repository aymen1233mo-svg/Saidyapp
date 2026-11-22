import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowRight, MapPin, Clock, Send, Package, CheckCircle, FileText,
  Bike, User, Phone, ClipboardList, Loader2, ShoppingCart, Utensils,
  Store, Boxes, Pill, Shirt, Smartphone, Gift, ChevronDown, ChevronUp,
  Home, Navigation, Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { queryClient } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/utils';

const PRIMARY_ORDER_CATEGORIES = [
  { value: 'بقالة', label: 'مواد غذائية ومستلزمات', shortLabel: 'مشتريات', icon: ShoppingCart, iconBg: 'bg-blue-50 text-[#0B5ED7]' },
  { value: 'طعام', label: 'مطاعم ومأكولات', shortLabel: 'مطاعم', icon: Utensils, iconBg: 'bg-orange-50 text-[#FF6B00]' },
  { value: 'طرود', label: 'طرود وطلبات متنوعة', shortLabel: 'طرود', icon: Boxes, iconBg: 'bg-sky-50 text-[#0B5ED7]' },
  { value: 'متاجر ومحلات', label: 'متاجر ومحلات', shortLabel: 'متاجر', icon: Store, iconBg: 'bg-indigo-50 text-[#0B5ED7]' },
];

const EXTRA_ORDER_TYPES = [
  { value: 'أدوية', label: 'أدوية وصيدلية', icon: Pill },
  { value: 'عسل وتمور', label: 'عسل وتمور', icon: Gift },
  { value: 'مستلزمات منزلية', label: 'مستلزمات منزلية', icon: Home },
  { value: 'ملابس', label: 'ملابس', icon: Shirt },
  { value: 'إلكترونيات', label: 'إلكترونيات', icon: Smartphone },
  { value: 'مستندات', label: 'مستندات وأوراق', icon: FileText },
  { value: 'هدايا', label: 'هدايا', icon: Gift },
  { value: 'أخرى', label: 'أخرى', icon: Package },
];

interface WasalniForm {
  customerName: string;
  customerPhone: string;
  fromAddress: string;
  toAddress: string;
  orderType: string;
  notes: string;
  scheduledDate: string;
  scheduledTime: string;
}

export default function WasalniPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [submittedRequest, setSubmittedRequest] = useState<any>(null);
  const [showInvoiceView, setShowInvoiceView] = useState(false);
  const [showMoreTypes, setShowMoreTypes] = useState(false);
  const [showScheduleFields, setShowScheduleFields] = useState(false);
  const [gettingLocationField, setGettingLocationField] = useState<'toAddress' | 'fromAddress' | null>(null);

  const validateYemeniPhone = (phone: string) => {
    const normalized = phone
      .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660))
      .replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06F0))
      .replace(/\s+/g, '');
    if (!normalized) {
      return { valid: false, normalized, error: 'يرجى إدخال رقم الهاتف' };
    }
    if (!/^\d{9}$/.test(normalized)) {
      return { valid: false, normalized, error: 'رقم الهاتف يجب أن يتكون من 9 أرقام بالضبط (مثال: 771234567)' };
    }
    if (!/^(77|78|71|70|73)/.test(normalized)) {
      return { valid: false, normalized, error: 'رقم الهاتف يجب أن يبدأ بـ 77 أو 78 أو 71 أو 70 أو 73' };
    }
    return { valid: true, normalized };
  };

  const getLocationAddress = async (targetField: 'toAddress' | 'fromAddress') => {
    if (!navigator.geolocation) {
      toast({ title: "الموقع غير مدعوم", description: "متصفحك لا يدعم تحديد الموقع", variant: "destructive" });
      return;
    }
    setGettingLocationField(targetField);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=ar`,
            { headers: { 'User-Agent': 'AlSaidiDelivery/1.0' } }
          );
          const data = await response.json();
          if (data && data.display_name) {
            const parts = data.display_name.split(',');
            const shortAddr = parts.slice(0, 4).join('،').trim();
            setForm(p => ({ ...p, [targetField]: shortAddr }));
            toast({ title: "تم تحديد الموقع", description: shortAddr });
          } else {
            const coordsText = `${(Number(latitude) || 0).toFixed(4)}, ${(Number(longitude) || 0).toFixed(4)}`;
            setForm(p => ({ ...p, [targetField]: coordsText }));
          }
        } catch {
          const coordsText = `${(Number(latitude) || 0).toFixed(4)}, ${(Number(longitude) || 0).toFixed(4)}`;
          setForm(p => ({ ...p, [targetField]: coordsText }));
          toast({ title: "تم تحديد الإحداثيات", description: "أدخل العنوان يدوياً لمزيد من الدقة" });
        } finally {
          setGettingLocationField(null);
        }
      },
      () => {
        setGettingLocationField(null);
        toast({ title: "تعذر تحديد الموقع", description: "يرجى السماح بالوصول للموقع أو إدخال العنوان يدوياً", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const today = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toTimeString().slice(0, 5);

  const [form, setForm] = useState<WasalniForm>({
    customerName: user?.name || user?.username || localStorage.getItem('customer_name') || '',
    customerPhone: user?.phone || localStorage.getItem('customer_phone') || '',
    fromAddress: '',
    toAddress: user?.address || '',
    orderType: 'طعام',
    notes: '',
    scheduledDate: today,
    scheduledTime: nowTime,
  });

  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        customerName: prev.customerName || user.name || user.username || localStorage.getItem('customer_name') || '',
        customerPhone: prev.customerPhone || user.phone || localStorage.getItem('customer_phone') || '',
        toAddress: prev.toAddress || user.address || '',
      }));
    }
  }, [user]);

  const { data: settings } = useQuery<any[]>({ queryKey: ['/api/ui-settings'] });
  const getSettingVal = (key: string, def = '') =>
    (settings as any[])?.find((s: any) => s.key === key)?.value || def;

  const deliveryFee = parseFloat(getSettingVal('wasalni_base_fee', '5'));
  const serviceName = getSettingVal('wasalni_service_name', 'طلب توصيل خاص');
  const openingTime = getSettingVal('opening_time', '08:00');
  const closingTime = getSettingVal('closing_time', '23:00');
  const storeStatus = getSettingVal('store_status', 'open');

  const { data: appStatus } = useQuery({
    queryKey: ['/api/app-status', openingTime, closingTime, storeStatus],
    queryFn: async () => {
      const res = await fetch(`/api/app-status?opening=${openingTime}&closing=${closingTime}&status=${storeStatus}`);
      return res.json();
    },
    enabled: !!settings
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/wasalni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'فشل في إرسال الطلب');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setSubmittedRequest(data.request);
      setShowInvoiceView(true);
      localStorage.setItem('customer_name', form.customerName);
      localStorage.setItem('customer_phone', form.customerPhone);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wasalni'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/customer'] });
      toast({
        title: "✅ تم إرسال طلب التوصيل بنجاح",
        description: `رقم الطلب: ${data.request.requestNumber}`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "خطأ",
        description: err.message || 'حدث خطأ، يرجى المحاولة مرة أخرى',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    if (appStatus && !appStatus.isOpen && storeStatus === 'closed') {
      toast({
        title: "التطبيق مغلق",
        description: "عذراً، التطبيق مغلق حالياً من قِبل الإدارة ولا يمكن استقبال طلبات جديدة",
        variant: "destructive"
      });
      return;
    }

    if (!form.toAddress.trim()) {
      toast({
        title: "عنوان التوصيل إجباري 📍",
        description: "يرجى إدخال عنوان التوصيل أو استخدام زر (تحديد الموقع) ليتكمن السائق من الوصول إليك.",
        variant: "destructive"
      });
      return;
    }

    if (!form.fromAddress.trim()) {
      toast({
        title: "عنوان الاستلام مطلوب",
        description: "يرجى تحديد مكان استلام الطلب (اسم المطعم، المحل، أو الحي)",
        variant: "destructive"
      });
      return;
    }

    if (!form.customerName.trim()) {
      toast({ title: "بيانات ناقصة", description: "يرجى إدخال الاسم بالكامل", variant: "destructive" });
      return;
    }

    if (!form.customerPhone.trim()) {
      toast({ title: "بيانات ناقصة", description: "يرجى إدخال رقم الهاتف", variant: "destructive" });
      return;
    }

    const phoneCheck = validateYemeniPhone(form.customerPhone);
    if (!phoneCheck.valid) {
      toast({ title: "رقم الهاتف غير صحيح 📱", description: phoneCheck.error, variant: "destructive" });
      return;
    }

    setForm(p => ({ ...p, customerPhone: phoneCheck.normalized }));

    createRequestMutation.mutate({
      customerName: form.customerName.trim(),
      customerPhone: phoneCheck.normalized,
      customerId: user?.id || undefined,
      fromAddress: form.fromAddress.trim(),
      toAddress: form.toAddress.trim(),
      orderType: form.orderType,
      notes: form.notes || undefined,
      scheduledDate: form.scheduledDate,
      scheduledTime: form.scheduledTime,
      estimatedFee: deliveryFee,
    });
  };

  if (showInvoiceView && submittedRequest) {
    return (
      <div className="min-h-screen bg-[#F4F8FF] pb-24" dir="rtl">
        {/* Al-Saidi Hero Header */}
        <div className="relative bg-gradient-to-br from-[#0B5ED7] via-[#0950BA] to-[#003B99] text-white px-4 pt-5 pb-10 rounded-b-[2.25rem] shadow-lg overflow-hidden">
          <div className="absolute -bottom-2 inset-x-0 h-3 bg-gradient-to-r from-[#FF6B00] via-[#FF8533] to-[#FF6B00] rounded-t-full opacity-90" />
          <div className="max-w-lg mx-auto flex items-center justify-between relative z-10">
            <button
              onClick={() => setLocation('/')}
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors backdrop-blur-sm"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <div className="text-center">
              <h1 className="text-xl font-black">فاتورة {serviceName}</h1>
              <p className="text-blue-100 text-xs font-semibold">الصايدي توصيل • سرعة في التوصيل</p>
            </div>
            <button
              onClick={() => setLocation('/')}
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors backdrop-blur-sm"
            >
              <Home className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 -mt-5 space-y-4 relative z-10">
          <div className="bg-white rounded-3xl border border-blue-100/80 shadow-[0_10px_30px_rgba(11,94,215,0.08)] p-6 text-center">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="h-9 w-9 text-emerald-500" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-1">تم استلام طلبك بنجاح!</h2>
            <p className="text-slate-500 text-sm font-medium">
              رقم الطلب:{' '}
              <span className="inline-block bg-[#0B5ED7] text-white font-black px-3 py-0.5 rounded-full text-xs mr-1">
                #{submittedRequest.requestNumber}
              </span>
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-blue-100/80 shadow-sm p-5 space-y-4">
            <h3 className="font-black text-slate-900 flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-[#0B5ED7]" />
              تفاصيل الطلب
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 bg-[#F4F8FF] border border-blue-100/70 rounded-2xl p-3.5">
                <MapPin className="h-4 w-4 text-[#0B5ED7] mt-0.5 shrink-0" />
                <div>
                  <p className="text-slate-500 text-xs font-bold">عنوان الاستلام</p>
                  <p className="font-black text-slate-800">{submittedRequest.fromAddress}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-[#F4F8FF] border border-blue-100/70 rounded-2xl p-3.5">
                <MapPin className="h-4 w-4 text-[#FF6B00] mt-0.5 shrink-0" />
                <div>
                  <p className="text-slate-500 text-xs font-bold">عنوان التوصيل</p>
                  <p className="font-black text-slate-800">{submittedRequest.toAddress}</p>
                </div>
              </div>
              <div className="flex items-center justify-between bg-[#F4F8FF] rounded-2xl p-3.5">
                <span className="text-slate-500 font-bold">نوع الطلب</span>
                <span className="font-black text-[#0B5ED7]">{submittedRequest.orderType}</span>
              </div>
              <div className="flex items-center justify-between bg-[#F4F8FF] rounded-2xl p-3.5">
                <span className="text-slate-500 font-bold">وقت التنفيذ</span>
                <span className="font-black text-slate-800">{submittedRequest.scheduledDate} - {submittedRequest.scheduledTime}</span>
              </div>
              {submittedRequest.notes && (
                <div className="bg-[#F4F8FF] rounded-2xl p-3.5">
                  <p className="text-slate-500 text-xs font-bold mb-1">ملاحظات</p>
                  <p className="text-slate-800 font-medium">{submittedRequest.notes}</p>
                </div>
              )}
            </div>

            <div className="bg-[#EEF5FF] border border-blue-200/80 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-slate-700 font-black block text-sm">التكلفة التقديرية للتوصيل</span>
                <span className="text-[11px] text-slate-500">* قد تتغير الرسوم النهائية بعد المراجعة</span>
              </div>
              <span className="text-xl font-black text-[#FF6B00]">{formatCurrency(deliveryFee)}</span>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <Button
              onClick={() => setLocation(`/orders/${submittedRequest.id}`)}
              className="w-full h-14 bg-gradient-to-r from-[#0B5ED7] to-[#003B99] text-white font-black text-base rounded-full hover:opacity-95 shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
            >
              <Navigation className="h-5 w-5" />
              تتبع السائق والطلب مباشرة على الخريطة
            </Button>

            <Button
              variant="outline"
              onClick={() => setLocation('/')}
              className="w-full h-12 bg-white text-[#0B5ED7] font-bold text-sm rounded-full border-blue-200 hover:bg-blue-50"
            >
              العودة إلى الصفحة الرئيسية
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isExtraSelected = EXTRA_ORDER_TYPES.some(t => t.value === form.orderType);

  return (
    <div className="min-h-screen bg-[#F4F8FF] pb-24" dir="rtl">
      {/* Al-Saidi Curved Hero Header */}
      <div className="relative bg-gradient-to-br from-[#0B5ED7] via-[#0950BA] to-[#003B99] text-white pt-4 pb-8 px-4 rounded-b-[2.5rem] shadow-lg overflow-hidden">
        {/* Decorative Orange Swoosh */}
        <div className="absolute -bottom-1 left-0 right-0 h-3 bg-gradient-to-r from-[#FF6B00] via-[#FF8533] to-[#FF6B00] opacity-95" />

        <div className="max-w-2xl mx-auto relative z-10">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setLocation('/')}
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors backdrop-blur-sm"
              aria-label="رجوع"
            >
              <ArrowRight className="h-5 w-5 text-white" />
            </button>
            <img
              src="/assets/saidi-logo.png"
              alt="الصايدي توصيل"
              className="h-11 object-contain drop-shadow-md"
            />
            <button
              onClick={() => setLocation('/')}
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors backdrop-blur-sm"
              aria-label="الرئيسية"
            >
              <Home className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Hero Split Banner matching Mockup 7724ef6a / 800a7534 */}
          <div className="flex items-center justify-between gap-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-4 mt-1">
            <div className="flex-1 text-right">
              <span className="inline-flex items-center gap-1.5 bg-[#FF6B00] text-white text-[11px] font-black px-3 py-1 rounded-full mb-2 shadow-sm">
                <Bike className="h-3.5 w-3.5" />
                {serviceName}
              </span>
              <h1 className="text-2xl font-black text-white leading-tight">طلب توصيل جديد</h1>
              <p className="text-blue-100 text-xs sm:text-sm font-semibold mt-1">أرسل طلبك بكل سهولة وبأسرع وقت</p>
            </div>
            <div className="w-28 h-24 sm:w-36 sm:h-28 shrink-0 rounded-2xl overflow-hidden border-2 border-white/30 shadow-md bg-white/10">
              <img
                src="/assets/saidi-courier-hero.jpg"
                alt="مندوب الصايدي توصيل"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 mt-5 space-y-4">
        {/* Location Cards (Pickup & Delivery) */}
        <div className="bg-white rounded-3xl border border-blue-100/80 shadow-[0_6px_24px_rgba(11,94,215,0.06)] p-4 sm:p-5 space-y-4">
          {/* عنوان التوصيل */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#EEF5FF] text-[#0B5ED7] flex items-center justify-center">
                  <MapPin className="h-4 w-4" />
                </span>
                عنوان التوصيل (إليك)
              </Label>
              <button
                type="button"
                onClick={() => getLocationAddress('toAddress')}
                disabled={gettingLocationField !== null}
                className="inline-flex items-center gap-1.5 text-xs font-black text-[#0B5ED7] bg-[#EEF5FF] hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
              >
                {gettingLocationField === 'toAddress' ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> جاري التحديد...</>
                ) : (
                  <><Navigation className="h-3.5 w-3.5" /> تحديد الموقع</>
                )}
              </button>
            </div>
            <Input
              value={form.toAddress}
              onChange={(e) => setForm(p => ({ ...p, toAddress: e.target.value }))}
              placeholder="مثال: عدن - كريتر - شارع الساحة"
              className="h-12 rounded-2xl border-blue-100 bg-[#F4F8FF] focus:bg-white focus:border-[#0B5ED7] font-medium"
            />
          </div>

          <div className="h-px bg-blue-50" />

          {/* عنوان الاستلام */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-orange-50 text-[#FF6B00] flex items-center justify-center">
                  <Store className="h-4 w-4" />
                </span>
                عنوان الاستلام (من أين نجلب الطلب؟)
              </Label>
              <button
                type="button"
                onClick={() => getLocationAddress('fromAddress')}
                disabled={gettingLocationField !== null}
                className="inline-flex items-center gap-1.5 text-xs font-black text-[#FF6B00] bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-full transition-colors"
              >
                {gettingLocationField === 'fromAddress' ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> جاري التحديد...</>
                ) : (
                  <><Navigation className="h-3.5 w-3.5" /> موقعي الحالي</>
                )}
              </button>
            </div>
            <Input
              value={form.fromAddress}
              onChange={(e) => setForm(p => ({ ...p, fromAddress: e.target.value }))}
              placeholder="مثال: اسم المطعم أو المتجر أو الشارع"
              className="h-12 rounded-2xl border-blue-100 bg-[#F4F8FF] focus:bg-white focus:border-[#0B5ED7] font-medium"
            />
          </div>
        </div>

        {/* Order Type Icon Grid (Matches Mockups 7724ef6a & 800a7534) */}
        <div className="bg-white rounded-3xl border border-blue-100/80 shadow-[0_6px_24px_rgba(11,94,215,0.06)] p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-orange-50 text-[#FF6B00] flex items-center justify-center">
                <Package className="h-4 w-4" />
              </span>
              اختر نوع الطلب
            </h2>
            <button
              type="button"
              onClick={() => setShowMoreTypes(v => !v)}
              className="text-xs font-bold text-[#0B5ED7] flex items-center gap-1 hover:underline"
            >
              {showMoreTypes ? 'عرض أقل' : 'أنواع أخرى'}
              {showMoreTypes ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {PRIMARY_ORDER_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = form.orderType === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, orderType: cat.value }))}
                  className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center gap-2 ${
                    isSelected
                      ? 'border-[#0B5ED7] bg-gradient-to-b from-[#0B5ED7] to-[#003B99] text-white shadow-md shadow-blue-600/20'
                      : 'border-blue-100/80 bg-[#F4F8FF] text-slate-700 hover:border-blue-300'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                    isSelected ? 'bg-white/20 text-white' : cat.iconBg
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-black leading-snug">{cat.label}</span>
                </button>
              );
            })}
          </div>

          {(showMoreTypes || isExtraSelected) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-blue-50">
              {EXTRA_ORDER_TYPES.map((item) => {
                const Icon = item.icon;
                const isSelected = form.orderType === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, orderType: item.value }))}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'border-[#0B5ED7] bg-[#0B5ED7] text-white shadow-sm'
                        : 'border-blue-100 bg-[#F4F8FF] text-slate-700 hover:border-blue-300'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-3xl border border-blue-100/80 shadow-[0_6px_24px_rgba(11,94,215,0.06)] p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-[#EEF5FF] text-[#0B5ED7] flex items-center justify-center">
                <User className="h-4 w-4" />
              </span>
              بيانات التواصل
            </h2>
            <button
              type="button"
              onClick={() => setShowScheduleFields(v => !v)}
              className="text-xs font-bold text-[#0B5ED7] flex items-center gap-1 hover:underline"
            >
              <Clock className="h-3.5 w-3.5" />
              {showScheduleFields ? 'إخفاء الوقت' : 'تحديد وقت التوصيل'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <User className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0B5ED7]" />
              <Input
                value={form.customerName}
                onChange={(e) => setForm(p => ({ ...p, customerName: e.target.value }))}
                placeholder="الاسم الكامل *"
                className="h-12 pr-10 rounded-2xl border-blue-100 bg-[#F4F8FF] focus:bg-white focus:border-[#0B5ED7] font-medium"
              />
            </div>
            <div className="relative">
              <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0B5ED7]" />
              <Input
                value={form.customerPhone}
                onChange={(e) => setForm(p => ({ ...p, customerPhone: e.target.value }))}
                placeholder="رقم الهاتف (مثال: 771234567) *"
                type="tel"
                className="h-12 pr-10 rounded-2xl border-blue-100 bg-[#F4F8FF] focus:bg-white focus:border-[#0B5ED7] font-medium"
              />
            </div>
          </div>

          {showScheduleFields && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-50">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-600">التاريخ</Label>
                <Input
                  type="date"
                  value={form.scheduledDate}
                  min={today}
                  onChange={(e) => setForm(p => ({ ...p, scheduledDate: e.target.value }))}
                  className="h-11 rounded-xl border-blue-100 bg-[#F4F8FF] focus:bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-600">الوقت</Label>
                <Input
                  type="time"
                  value={form.scheduledTime}
                  onChange={(e) => setForm(p => ({ ...p, scheduledTime: e.target.value }))}
                  className="h-11 rounded-xl border-blue-100 bg-[#F4F8FF] focus:bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-3xl border border-blue-100/80 shadow-[0_6px_24px_rgba(11,94,215,0.06)] p-4 sm:p-5 space-y-2.5">
          <Label className="text-sm font-black text-slate-900 flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-[#EEF5FF] text-[#0B5ED7] flex items-center justify-center">
              <ClipboardList className="h-4 w-4" />
            </span>
            ملاحظات إضافية (اختياري)
          </Label>
          <Textarea
            value={form.notes}
            onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
            placeholder="أضف وصف الطلب أو أي تعليمات للمندوب هنا..."
            className="min-h-[95px] rounded-2xl border-blue-100 bg-[#F4F8FF] focus:bg-white focus:border-[#0B5ED7] resize-none"
          />
        </div>

        {/* Estimated Cost Pill & Primary Submit Button */}
        <div className="space-y-3 pt-1">
          <div className="bg-[#EEF5FF] border border-blue-200 rounded-full px-5 py-3.5 flex items-center justify-between shadow-sm">
            <span className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Wallet className="h-5 w-5 text-[#0B5ED7]" />
              التكلفة التقديرية
            </span>
            <span className="text-lg font-black text-[#0B5ED7]">
              {formatCurrency(deliveryFee)}
            </span>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={createRequestMutation.isPending}
            className="w-full h-14 rounded-full bg-gradient-to-r from-[#0B5ED7] via-[#0950BA] to-[#FF6B00] hover:opacity-95 text-white text-lg font-black shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2.5 transition-all active:scale-[0.99]"
          >
            {createRequestMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                جاري إرسال الطلب...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                إرسال الطلب
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
