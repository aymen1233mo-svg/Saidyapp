import { useState, useEffect, useMemo } from 'react';
import { Minus, Plus, Trash2, ShoppingBag, X, MapPin, Loader2, AlertTriangle, Tag, CheckCircle, Check, ChevronLeft } from 'lucide-react'; 
import { useCart } from '../context/CartContext';
import { useUserLocation as useGeoLocation } from '../context/LocationContext';
import { GoogleMapsLocationPicker, LocationData } from './GoogleMapsLocationPicker';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import OutOfDeliveryZoneModal from '@/components/OutOfDeliveryZoneModal';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Cart({ isOpen, onClose }: CartProps) {
  const { state, updateQuantity, removeItem, addNotes, clearCart, setDeliveryFee: setContextDeliveryFee } = useCart();
  const { location: userGeoLocation, getCurrentLocation } = useGeoLocation();
  const { user } = useAuth();
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0); 
  const [deliveryDetails, setDeliveryDetails] = useState<any>(null);
  const [isCalculatingFee, setIsCalculatingFee] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [customerInfo, setCustomerInfo] = useState({
    name: user?.name || user?.username || localStorage.getItem('customer_name') || '',
    phone: user?.phone || localStorage.getItem('customer_phone') || '',
    notes: '',
    paymentMethod: 'cash'
  });

  useEffect(() => {
    if (user || isOpen) {
      setCustomerInfo(prev => ({
        ...prev,
        name: prev.name || user?.name || user?.username || localStorage.getItem('customer_name') || '',
        phone: prev.phone || user?.phone || localStorage.getItem('customer_phone') || '',
      }));
    }
  }, [user, isOpen]);

  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [showOutOfZoneModal, setShowOutOfZoneModal] = useState(false);
  const [isOutsideZone, setIsOutsideZone] = useState(false);
  const [outOfZoneReason, setOutOfZoneReason] = useState('');

  // ─── نظام الكوبون ───────────────────────────────────────────────────
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<{
    valid: boolean;
    discount?: number;
    message?: string;
    couponId?: string;
  } | null>(null);
  const [isCouponValidating, setIsCouponValidating] = useState(false);

  useEffect(() => {
    setCouponResult(null);
    setCouponCode('');
  }, [state.restaurantId]);

  useEffect(() => {
    if (isOpen && !userGeoLocation.position && !userGeoLocation.isLoading && !userGeoLocation.error) {
      getCurrentLocation();
    }
  }, [isOpen, userGeoLocation.position, userGeoLocation.isLoading]);

  useEffect(() => {
    if (userGeoLocation.position && !selectedLocation && isOpen) {
      const { latitude, longitude } = userGeoLocation.position.coords;
      setSelectedLocation({
        lat: latitude,
        lng: longitude,
        address: 'موقعي الحالي (GPS)',
        area: 'تحديد تلقائي'
      });
    }
  }, [userGeoLocation.position, selectedLocation, isOpen]);

  const { data: uiSettings } = useQuery<any[]>({
    queryKey: ['/api/ui-settings'],
  });

  const getSetting = (key: string, def = '') => 
    uiSettings?.find((s: any) => s.key === key)?.value || def;

  const { data: adminPaymentMethods = [] } = useQuery<any[]>({
    queryKey: ['/api/payment-methods'],
  });

  const showCashPayment = getSetting('show_cash_payment', 'true') !== 'false';
  const showPaymentCards = getSetting('show_payment_cards', 'true') !== 'false';
  const showBankTransfer = getSetting('show_bank_transfer', 'false') === 'true';
  const showCouponBoxAlways = getSetting('show_coupon_box_always', 'true') !== 'false';
  const couponMinOrderValue = parseFloat(getSetting('coupon_min_order_value', '0') || '0');
  const showCouponBox = showCouponBoxAlways || (couponMinOrderValue > 0 && state.subtotal >= couponMinOrderValue);

  const paymentMethods = useMemo(() => {
    const methods: { id: string; name: string; icon: string }[] = [];
    if (showCashPayment) {
      methods.push({ id: 'cash', name: 'نقداً عند الاستلام', icon: '💵' });
    }
    if (showPaymentCards) {
      if ((adminPaymentMethods as any[]).length > 0) {
        const iconMap: Record<string, string> = {
          mada: '🏦', stc_pay: '📱', apple_pay: '🍎',
          visa: '💳', mastercard: '💳', tabby: '📊',
          tamara: '📈', wallet: '👛', online: '🌐', card: '💳',
        };
        (adminPaymentMethods as any[])
          .filter((m: any) => m.isActive && m.type !== 'cash' && m.type !== 'bank_transfer')
          .forEach((m: any) => {
            methods.push({
              id: m.provider || m.type,
              name: m.name || m.provider,
              icon: iconMap[m.provider] || '💳',
            });
          });
      } else {
        methods.push({ id: 'card', name: 'بطاقة دفع', icon: '💳' });
        methods.push({ id: 'wallet', name: 'المحفظة', icon: '👛' });
        methods.push({ id: 'online', name: 'دفع إلكتروني', icon: '🌐' });
      }
    }
    if (showBankTransfer) {
      methods.push({ id: 'bank_transfer', name: 'تحويل بنكي', icon: '🏛️' });
    }
    return methods.length > 0
      ? methods
      : [{ id: 'cash', name: 'نقداً عند الاستلام', icon: '💵' }];
  }, [adminPaymentMethods, showCashPayment, showPaymentCards, showBankTransfer, uiSettings]);

  const { data: restaurant } = useQuery({
    queryKey: [`/api/restaurants/${state.restaurantId}`],
    enabled: !!state.restaurantId,
  });

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchDeliveryFee = async () => {
      if (!selectedLocation?.lat || !selectedLocation?.lng) {
        return;
      }

      setIsCalculatingFee(true);
      try {
        const response = await fetch('/api/delivery-fees/calculate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerLat: selectedLocation.lat,
            customerLng: selectedLocation.lng,
            restaurantId: state.restaurantId || null,
            orderSubtotal: state.subtotal || 0
          }),
          signal: abortController.signal
        });
        
        if (!response.ok) throw new Error('فشل في حساب رسوم التوصيل');
        
        const data = await response.json();
        if (isMounted && data.success) {
          setDeliveryFee(data.fee);
          setDeliveryDetails(data);
          setContextDeliveryFee(data.fee);

          if (data.isOutsideDeliveryZone) {
            setIsOutsideZone(true);
            setOutOfZoneReason(data.outsideReason || 'الموقع المحدد خارج نطاق ومناطق التوصيل المعتمدة لدينا.');
            setShowOutOfZoneModal(true);
          } else {
            setIsOutsideZone(false);
            setOutOfZoneReason('');
          }
        }
      } catch (error: any) {
        if (isMounted && error.name !== 'AbortError') {
          console.error('Failed to calculate delivery fee:', error);
        }
      } finally {
        if (isMounted) {
          setIsCalculatingFee(false);
        }
      }
    };

    fetchDeliveryFee();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [selectedLocation?.lat, selectedLocation?.lng, state.restaurantId, state.subtotal]);

  const getRestaurantLocation = () => {
    const r = restaurant as any;
    if (r && r.latitude && r.longitude) {
      return { 
        lat: parseFloat(r.latitude), 
        lng: parseFloat(r.longitude) 
      };
    }
    return undefined;
  };

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsCouponValidating(true);
    try {
      const categoryIds = [...new Set(state.items.map((i: any) => i.categoryId).filter(Boolean))];
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode.trim().toUpperCase(),
          orderValue: state.subtotal,
          categoryIds,
          restaurantId: state.restaurantId,
        }),
      });
      const data = await res.json();
      if (data.valid) {
        setCouponResult({ valid: true, discount: data.discount || 0, couponId: data.coupon?.id });
      } else {
        setCouponResult({ valid: false, message: data.message || 'كود الكوبون غير صحيح' });
      }
    } catch {
      setCouponResult({ valid: false, message: 'تعذر التحقق من الكوبون، حاول مرة أخرى' });
    } finally {
      setIsCouponValidating(false);
    }
  };

  const appliedDiscount = couponResult?.valid ? couponResult.discount || 0 : 0;

  if (!isOpen) return null;

  const saveCustomerInfoToProfile = async () => {
    try {
      if (customerInfo.phone) {
        localStorage.setItem('customer_phone', customerInfo.phone.trim().replace(/\s+/g, ''));
      }
      if (customerInfo.name) {
        localStorage.setItem('customer_name', customerInfo.name);
      }
    } catch (e) {
      console.error('Failed to persist customer info locally:', e);
    }
  };

  const buildOrderData = () => ({
    customerName: customerInfo.name,
    customerPhone: customerInfo.phone,
    deliveryAddress: selectedLocation?.address || '',
    customerLocationLat: selectedLocation?.lat,
    customerLocationLng: selectedLocation?.lng,
    notes: [
      customerInfo.notes,
      couponResult?.valid && couponCode ? `كوبون: ${couponCode} (خصم: ${appliedDiscount})` : ''
    ].filter(Boolean).join(' | ') || undefined,
    paymentMethod: customerInfo.paymentMethod,
    items: JSON.stringify(state.items),
    subtotal: state.subtotal,
    deliveryFee: deliveryFee,
    totalAmount: Math.max(0, state.subtotal + deliveryFee - appliedDiscount),
    total: Math.max(0, state.subtotal + deliveryFee - appliedDiscount),
    restaurantId: state.restaurantId,
    couponCode: couponResult?.valid ? couponCode.trim().toUpperCase() : undefined,
    couponDiscount: appliedDiscount > 0 ? appliedDiscount : undefined,
    deliveryPreference: 'now',
    scheduledDate: null,
    scheduledTimeSlot: null,
  });

  const submitOrder = async (orderData: any): Promise<{ success: boolean; data: any; error?: string }> => {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    const data = await response.json();
    if (response.ok) {
      return { success: true, data };
    }
    return { success: false, data, error: data.error || data.message || 'فشل في إرسال الطلب' };
  };

  const handleCheckout = async () => {
    if (isSubmitting) {
      setShowDuplicateConfirm(true);
      return;
    }

    if (!selectedLocation) {
      toast({
        title: "موقع التوصيل مطلوب",
        description: "يرجى تحديد موقع التوصيل من الخريطة",
        variant: "destructive",
      });
      return;
    }

    if (!customerInfo.name || !customerInfo.phone) {
      toast({
        title: "معلومات ناقصة",
        description: "يرجى إدخال الاسم ورقم الهاتف",
        variant: "destructive",
      });
      return;
    }

    const minimumOrderEnabled = getSetting('minimum_order_enabled', 'false') === 'true';
    const minimumOrderDefault = parseFloat(getSetting('minimum_order_default', '0') || '0');

    if (minimumOrderEnabled && minimumOrderDefault > 0 && state.subtotal < minimumOrderDefault) {
      toast({
        title: "لم يتم استيفاء الحد الأدنى للطلب",
        description: `الحد الأدنى للطلب هو ${minimumOrderDefault} ريال. أضف منتجات بقيمة ${(minimumOrderDefault - state.subtotal).toFixed(2)} ريال للمتابعة.`,
        variant: "destructive",
      });
      return;
    }

    if (isOutsideZone) {
      setShowOutOfZoneModal(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const orderData = buildOrderData();
      const result = await submitOrder(orderData);

      if (result.success) {
        await saveCustomerInfoToProfile();
        toast({
          title: "تم تأكيد طلبك بنجاح! 🎉",
          description: `رقم الطلب: ${result.data.order?.orderNumber || result.data.orderNumber}`,
        });
        clearCart();
        onClose();
      } else {
        const errorMsg = result.error || 'فشل في إرسال الطلب';
        if (
          result.data?.code === 'OUT_OF_DELIVERY_ZONE' ||
          errorMsg.includes('خارج نطاق التوصيل') ||
          errorMsg.includes('خارج مناطق وأحياء التوصيل')
        ) {
          setIsOutsideZone(true);
          setOutOfZoneReason(errorMsg);
          setShowOutOfZoneModal(true);
          return;
        }
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('Order error:', error);
      toast({
        title: "خطأ في إرسال الطلب",
        description: error.message || "يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmResend = async () => {
    setShowDuplicateConfirm(false);
    if (!customerInfo.name || !customerInfo.phone || !selectedLocation) return;

    setIsSubmitting(true);
    try {
      const orderData = buildOrderData();
      const result = await submitOrder(orderData);
      if (result.success) {
        await saveCustomerInfoToProfile();
        toast({
          title: "تم تأكيد طلبك بنجاح! 🎉",
          description: `رقم الطلب: ${result.data.order?.orderNumber || result.data.orderNumber}`,
        });
        clearCart();
        onClose();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "خطأ في إرسال الطلب",
        description: error.message || "يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const finalCalculatedTotal = Math.max(
    0,
    (selectedLocation ? state.subtotal + deliveryFee : state.subtotal) - appliedDiscount
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-center items-end sm:items-center" dir="rtl">
      <div className="bg-[#F4F8FF] w-full max-w-md h-[88vh] sm:h-[85vh] rounded-t-[2rem] sm:rounded-[2rem] flex flex-col overflow-hidden shadow-2xl border border-blue-100">
        {/* رأس السلة بتصميم الصايدي توصيل */}
        <div className="relative bg-gradient-to-br from-[#0B5ED7] via-[#0950BA] to-[#003B99] text-white px-5 pt-4 pb-6 shrink-0 overflow-hidden">
          <div className="absolute -bottom-1 left-0 right-0 h-2 bg-gradient-to-r from-[#FF6B00] via-[#FF8533] to-[#FF6B00]" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black">سلة الطلبات</h2>
                  {state.items.length > 0 && (
                    <span className="bg-[#FF6B00] text-white text-xs font-black px-2 py-0.5 rounded-full">
                      {state.items.length}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-blue-100 font-semibold">مراجعة طلبك قبل إتمامه</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-white/15 hover:bg-white/25 rounded-full flex items-center justify-center transition-colors"
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* المحتوى */}
        <div className="flex-1 overflow-y-auto">
          {state.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6 text-center">
              <div className="w-20 h-20 rounded-3xl bg-[#EEF5FF] border border-blue-100 flex items-center justify-center mb-4">
                <ShoppingBag size={40} className="text-[#0B5ED7]" />
              </div>
              <p className="font-black text-slate-800 text-base">سلة الطلبات فارغة</p>
              <p className="text-xs text-slate-400 mt-1">أضف منتجات من المتاجر والمطاعم لتبدأ طلبك</p>
            </div>
          ) : (userGeoLocation.isLoading || isCalculatingFee) && !selectedLocation ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4 p-6">
              <Loader2 size={44} className="animate-spin text-[#0B5ED7]" />
              <div className="text-center">
                <p className="font-black text-slate-800">جاري حساب رسوم التوصيل...</p>
                <p className="text-xs text-slate-400 mt-1">يرجى الانتظار قليلاً لنتمكن من تحديد موقعك</p>
              </div>
            </div>
          ) : (
            <>
              {state.restaurantName && (
                <div className="mx-4 mt-4 px-4 py-2.5 bg-white border border-blue-100 rounded-2xl flex items-center justify-between shadow-xs">
                  <span className="text-xs font-bold text-slate-500">الطلب من</span>
                  <span className="text-sm font-black text-[#0B5ED7]">{state.restaurantName}</span>
                </div>
              )}

              {/* عناصر السلة */}
              <div className="p-4 space-y-3">
                {state.items.map((item) => (
                  <div key={item.id} className="bg-white border border-blue-100/80 rounded-2xl p-3.5 shadow-xs space-y-2.5">
                    <div className="flex items-center gap-3">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 rounded-2xl object-cover border border-blue-50 shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-slate-900 text-sm truncate">{item.name}</h4>
                        {item.description && (
                          <p className="text-xs text-slate-400 truncate mt-0.5">{item.description}</p>
                        )}
                        <p className="text-[#0B5ED7] font-black text-sm mt-1">{formatCurrency(item.price)}</p>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center shrink-0 transition-colors"
                        aria-label="حذف"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* التحكم في الكمية */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-full bg-[#0B5ED7] text-white hover:bg-[#0950BA] flex items-center justify-center shadow-xs transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="min-w-[2.25rem] text-center px-2 py-1 bg-[#F4F8FF] border border-blue-100 rounded-xl font-black text-sm text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-full bg-[#0B5ED7] text-white hover:bg-[#0950BA] flex items-center justify-center shadow-xs transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="font-black text-sm text-slate-900">
                        {formatCurrency(parseFloat(item.price) * item.quantity)}
                      </span>
                    </div>

                    <textarea
                      placeholder="ملاحظات خاصة بهذا العنصر (اختياري)"
                      value={item.notes || ''}
                      onChange={(e) => addNotes(item.id, e.target.value)}
                      className="w-full p-2.5 bg-[#F4F8FF] border border-blue-100 rounded-xl text-xs resize-none focus:bg-white focus:border-[#0B5ED7] focus:outline-none"
                      rows={1}
                    />
                  </div>
                ))}
              </div>

              {!showCheckout ? (
                <div className="px-4 pb-6 space-y-4">
                  {/* ملخص الطلب */}
                  <div className="bg-white rounded-3xl border border-blue-100/80 p-4 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-blue-50 pb-2.5">
                      <h3 className="font-black text-slate-900 text-sm">ملخص الطلب</h3>
                    </div>

                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>المجموع الفرعي</span>
                      <span className="text-slate-900 font-black">{formatCurrency(state.subtotal)}</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                        <span>رسوم التوصيل</span>
                        <div>
                          {!selectedLocation ? (
                            <span className="text-[11px] text-[#FF6B00] font-black bg-orange-50 px-2.5 py-0.5 rounded-full">
                              جاري تحديد الموقع...
                            </span>
                          ) : isCalculatingFee ? (
                            <Loader2 className="h-4 w-4 animate-spin text-[#0B5ED7] inline" />
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className={`font-black ${deliveryDetails?.isFreeDelivery ? "line-through text-slate-400" : "text-slate-900"}`}>
                                {formatCurrency(deliveryFee)}
                              </span>
                              {deliveryDetails?.isFreeDelivery && (
                                <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-black">مجاني</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedLocation && deliveryDetails && !isCalculatingFee && (
                        <div className="flex items-center justify-between text-[11px] text-slate-500 bg-[#F4F8FF] px-3 py-1.5 rounded-xl">
                          <span className="flex items-center gap-1 font-bold">
                            <MapPin className="h-3 w-3 text-[#0B5ED7]" />
                            المسافة: {deliveryDetails.distance.toFixed(1)} كم
                          </span>
                          <span className="font-bold">⏱ {deliveryDetails.estimatedTime}</span>
                        </div>
                      )}
                    </div>

                    <div className="bg-[#EEF5FF] rounded-2xl px-4 py-3 flex justify-between items-center">
                      <span className="font-black text-slate-900 text-sm">المجموع الكلي</span>
                      <span className="text-lg font-black text-[#FF6B00]">
                        {formatCurrency(finalCalculatedTotal)}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={() => setShowCheckout(true)}
                    disabled={!selectedLocation || isCalculatingFee}
                    className="w-full h-14 bg-[#FF6B00] hover:bg-[#E55E00] text-white rounded-full font-black text-base shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all"
                  >
                    {!selectedLocation ? (
                      <>
                        <MapPin size={18} />
                        حدد الموقع للمتابعة
                      </>
                    ) : isCalculatingFee ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        جاري حساب التوصيل...
                      </>
                    ) : (
                      <>
                        إتمام الطلب
                        <ChevronLeft size={18} />
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="px-4 pb-6 space-y-4">
                  {/* معلومات العميل */}
                  <div className="bg-white rounded-3xl border border-blue-100/80 p-4 space-y-3 shadow-xs">
                    <h3 className="font-black text-slate-900 text-sm">معلومات العميل</h3>
                    <div className="space-y-2.5">
                      <input
                        type="text"
                        placeholder="الاسم *"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                        className="w-full px-3.5 py-3 bg-[#F4F8FF] border border-blue-100 rounded-2xl text-sm font-medium focus:bg-white focus:border-[#0B5ED7] focus:outline-none"
                      />
                      <input
                        type="tel"
                        placeholder="رقم الهاتف *"
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                        className="w-full px-3.5 py-3 bg-[#F4F8FF] border border-blue-100 rounded-2xl text-sm font-medium focus:bg-white focus:border-[#0B5ED7] focus:outline-none"
                      />
                      <textarea
                        placeholder="ملاحظات إضافية"
                        value={customerInfo.notes}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#F4F8FF] border border-blue-100 rounded-2xl text-sm resize-none focus:bg-white focus:border-[#0B5ED7] focus:outline-none"
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* تحديد الموقع */}
                  <div className="bg-white rounded-3xl border border-blue-100/80 p-4 space-y-2.5 shadow-xs">
                    <h3 className="font-black text-slate-900 text-sm">موقع التوصيل *</h3>
                    {selectedLocation ? (
                      <div className="p-3 bg-[#EEF5FF] border border-blue-200 rounded-2xl">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-black text-[#0B5ED7] text-xs">{selectedLocation.area}</p>
                            <p className="text-xs text-slate-700 font-medium truncate">{selectedLocation.address}</p>
                            {deliveryDetails && (
                              <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-600 font-bold">
                                {deliveryDetails.distance > 0 && <span>المسافة: {deliveryDetails.distance.toFixed(2)} كم</span>}
                                {deliveryDetails.estimatedTime && <span>⏱ {deliveryDetails.estimatedTime}</span>}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowLocationPicker(true)}
                            className="rounded-full border-[#0B5ED7] text-[#0B5ED7] hover:bg-blue-50 font-bold shrink-0"
                          >
                            تغيير
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full rounded-full border-[#0B5ED7] text-[#0B5ED7] hover:bg-blue-50 font-bold"
                        onClick={() => setShowLocationPicker(true)}
                        data-testid="button-select-location"
                      >
                        <MapPin className="h-4 w-4 ml-2" />
                        تحديد موقع التوصيل
                      </Button>
                    )}
                  </div>

                  {/* طرق الدفع */}
                  {paymentMethods.length > 0 && (
                    <div className="bg-white rounded-3xl border border-blue-100/80 p-4 space-y-2.5 shadow-xs">
                      <h3 className="font-black text-slate-900 text-sm">طريقة الدفع *</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {paymentMethods.map((method) => (
                          <button
                            key={method.id}
                            onClick={() => setCustomerInfo({ ...customerInfo, paymentMethod: method.id })}
                            className={`p-3 border-2 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all ${
                              customerInfo.paymentMethod === method.id 
                                ? 'border-[#0B5ED7] bg-[#EEF5FF] text-[#0B5ED7] shadow-xs' 
                                : 'border-blue-50 bg-[#F4F8FF] text-slate-700 hover:border-blue-200'
                            }`}
                          >
                            <span className="text-xl">{method.icon}</span>
                            <span className="text-[11px] font-black">{method.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* كوبون الخصم */}
                  {showCouponBox && (
                    <div className="bg-white rounded-3xl border border-dashed border-blue-300 p-3.5 space-y-2 shadow-xs">
                      <h3 className="font-black text-xs text-[#0B5ED7] flex items-center gap-1.5">
                        <Tag className="h-4 w-4 text-[#0B5ED7]" />
                        استخدام كود خصم
                      </h3>
                      {couponResult?.valid ? (
                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl px-3 py-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                            <div>
                              <p className="text-sm font-black text-emerald-700">{couponCode}</p>
                              <p className="text-xs text-emerald-600 font-bold">وفّرت {formatCurrency(couponResult.discount || 0)}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => { setCouponCode(''); setCouponResult(null); }}
                            className="text-rose-500 hover:text-rose-700 text-xs font-black"
                          >
                            إزالة
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={couponCode}
                              onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null); }}
                              placeholder="أدخل كود الخصم"
                              className="flex-1 px-3.5 py-2.5 bg-[#F4F8FF] border border-blue-100 rounded-full text-sm font-mono focus:bg-white focus:outline-none focus:border-[#0B5ED7]"
                              dir="ltr"
                              onKeyDown={(e) => e.key === 'Enter' && handleValidateCoupon()}
                            />
                            <button
                              onClick={handleValidateCoupon}
                              disabled={isCouponValidating || !couponCode.trim()}
                              className="w-10 h-10 rounded-full bg-[#0B5ED7] text-white hover:bg-[#0950BA] disabled:opacity-50 flex items-center justify-center shrink-0 shadow-sm"
                              aria-label="تطبيق الكوبون"
                            >
                              {isCouponValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            </button>
                          </div>
                          {couponResult && !couponResult.valid && (
                            <p className="text-xs text-rose-500 font-bold">{couponResult.message}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {couponResult?.valid && (couponResult.discount || 0) > 0 && (
                    <div className="bg-[#EEF5FF] rounded-2xl p-3.5 space-y-1.5 border border-blue-200/70">
                      <div className="flex justify-between text-xs font-bold text-slate-600">
                        <span>المجموع</span>
                        <span>{formatCurrency(state.subtotal + deliveryFee)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-emerald-600 font-black">
                        <span>خصم الكوبون</span>
                        <span>- {formatCurrency(couponResult.discount || 0)}</span>
                      </div>
                      <div className="flex justify-between font-black text-base pt-1 border-t border-blue-200">
                        <span className="text-slate-900">الإجمالي</span>
                        <span className="text-[#FF6B00]">{formatCurrency(finalCalculatedTotal)}</span>
                      </div>
                    </div>
                  )}

                  {/* أزرار الإجراء */}
                  <div className="flex flex-col gap-2.5 pt-2">
                    <Button
                      onClick={handleCheckout}
                      disabled={isSubmitting}
                      className="w-full h-14 bg-[#FF6B00] hover:bg-[#E55E00] text-white rounded-full font-black text-base shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          جاري إرسال الطلب...
                        </>
                      ) : (
                        <>
                          تأكيد الطلب ({formatCurrency(finalCalculatedTotal)})
                        </>
                      )}
                    </Button>
                    <button
                      onClick={() => setShowCheckout(false)}
                      disabled={isSubmitting}
                      className="w-full py-2.5 text-[#0B5ED7] font-bold hover:underline transition-colors text-sm disabled:opacity-50"
                    >
                      رجوع لتعديل السلة
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <GoogleMapsLocationPicker
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onLocationSelect={setSelectedLocation}
        restaurantLocation={getRestaurantLocation()}
      />

      {showDuplicateConfirm && (
        <div className="fixed inset-0 bg-black/70 z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-blue-100">
            <div className="bg-[#FF6B00] px-5 py-4 text-white">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-black text-lg">تنبيه</h3>
              </div>
            </div>
            <div className="px-5 py-5">
              <p className="text-slate-900 font-black text-base mb-1">
                الطلب قيد الإرسال حالياً
              </p>
              <p className="text-slate-500 text-sm mb-5">
                يبدو أن طلبك قد تم استلامه. هل أنت متأكد أنك تريد إرسال الطلب مرة أخرى؟
              </p>
              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-[#FF6B00] hover:bg-[#E55E00] text-white rounded-full font-bold"
                  onClick={handleConfirmResend}
                >
                  نعم، إرسال مجدداً
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 rounded-full border-blue-200 text-[#0B5ED7] font-bold"
                  onClick={() => setShowDuplicateConfirm(false)}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <OutOfDeliveryZoneModal
        isOpen={showOutOfZoneModal}
        onClose={() => setShowOutOfZoneModal(false)}
        onChangeLocation={() => {
          setShowOutOfZoneModal(false);
          setShowLocationPicker(true);
        }}
        reason={outOfZoneReason}
      />
    </div>
  );
}
