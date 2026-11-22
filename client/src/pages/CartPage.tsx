import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, Trash2, MapPin, Tag, CheckCircle, XCircle, Loader2, AlertCircle, Plus, Minus, ShoppingBag, Check, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useCart } from '../context/CartContext';
import { useUserLocation as useCoordinates } from '../context/LocationContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { InsertOrder, Restaurant } from '@shared/schema';
import { getAppStatus, getRestaurantStatus } from '@/utils/restaurantHours';
import { formatCurrency } from '@/lib/utils';
import AppClosedOverlay from '@/components/AppClosedOverlay';
import { useAuth } from '@/context/AuthContext';
import OutOfDeliveryZoneModal from '@/components/OutOfDeliveryZoneModal';

export default function CartPage() {
  const [, setLocation] = useLocation();
  const { state, removeItem, updateQuantity, clearCart, setDeliveryFee } = useCart();
  const { items, subtotal, total, deliveryFee } = state;
  const { toast } = useToast();
  const { user } = useAuth();
  const { location: userLocation, getCurrentLocation } = useCoordinates();
  const [calculatingFee, setCalculatingFee] = useState(false);
  const [showOutOfZoneModal, setShowOutOfZoneModal] = useState(false);
  const [outOfZoneReason, setOutOfZoneReason] = useState('');
  const [deliveryInfo, setDeliveryInfo] = useState<{
    distance: number;
    estimatedTime: string;
    isFreeDelivery: boolean;
  } | null>(null);

  const [showAppClosedOverlay, setShowAppClosedOverlay] = useState(false);
  const [appClosedMessage, setAppClosedMessage] = useState('');

  const restaurantId = items[0]?.restaurantId;

  const { data: restaurant } = useQuery<Restaurant>({
    queryKey: ['/api/restaurants', restaurantId],
    enabled: !!restaurantId,
  });

  const { data: restaurantSections = [] } = useQuery<any[]>({
    queryKey: ['/api/restaurants', restaurantId, 'sections'],
    queryFn: async () => {
      if (!restaurantId) return [];
      const res = await fetch(`/api/restaurants/${restaurantId}/sections`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!restaurantId,
  });

  const { data: restaurantDiscountOffers = [] } = useQuery<any[]>({
    queryKey: ['/api/special-offers/discount', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const res = await fetch(`/api/special-offers?restaurantId=${restaurantId}&offerType=discount`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.filter((o: any) => (o.offerType === 'discount' || !o.offerType) && o.isActive);
    },
    enabled: !!restaurantId,
  });

  const appliedOfferDiscount = (() => {
    if (!restaurantDiscountOffers.length || subtotal === 0) return { amount: 0, offer: null };
    
    let bestDiscount = 0;
    let bestOffer: any = null;

    for (const offer of restaurantDiscountOffers) {
      if (offer.restaurantId && offer.restaurantId !== restaurantId) continue;

      const minOrder = parseFloat(offer.minimumOrder || offer.minOrderAmount || '0');
      const isSectionScope = offer.discountScope === 'section' || offer.discountScope === 'category' || !!offer.sectionId || !!offer.categoryId;
      let qualifyingSubtotal = 0;

      if (isSectionScope) {
        const targetSection = restaurantSections.find((s: any) => s.id === offer.sectionId || s.id === offer.categoryId);
        const targetSectionName = targetSection ? targetSection.name.trim().toLowerCase() : null;
        const offerSectionName = offer.sectionName ? offer.sectionName.trim().toLowerCase() : null;
        const offerCategoryName = offer.categoryName ? offer.categoryName.trim().toLowerCase() : null;
        const offerTitle = offer.title ? offer.title.trim().toLowerCase() : null;

        const qualifyingItems = items.filter((item: any) => {
          if (item.sectionId && offer.sectionId && item.sectionId === offer.sectionId) return true;
          if (item.categoryId && offer.categoryId && item.categoryId === offer.categoryId) return true;
          
          if (item.category) {
            const itemCat = item.category.trim().toLowerCase();
            if (targetSectionName && itemCat === targetSectionName) return true;
            if (offerSectionName && itemCat === offerSectionName) return true;
            if (offerCategoryName && itemCat === offerCategoryName) return true;
            if (offerTitle && itemCat === offerTitle) return true;
          }
          return false;
        });

        qualifyingSubtotal = qualifyingItems.reduce((sum: number, item: any) => sum + parseFloat(item.price) * item.quantity, 0);
      } else {
        qualifyingSubtotal = subtotal;
      }

      if (qualifyingSubtotal < minOrder || qualifyingSubtotal <= 0) continue;

      let discount = 0;
      if (offer.discountPercent) {
        discount = (qualifyingSubtotal * parseFloat(offer.discountPercent)) / 100;
      } else if (offer.discountAmount) {
        discount = Math.min(parseFloat(offer.discountAmount), qualifyingSubtotal);
      }

      if (discount > bestDiscount) {
        bestDiscount = discount;
        bestOffer = offer;
      }
    }

    return { amount: Math.round(bestDiscount * 100) / 100, offer: bestOffer };
  })();

  const { data: uiSettings } = useQuery<any[]>({
    queryKey: ['/api/ui-settings'],
  });

  const { data: paymentMethods = [] } = useQuery<any[]>({
    queryKey: ['/api/payment-methods'],
  });

  const getSetting = (key: string, fallback = '') =>
    (uiSettings as any[])?.find((s: any) => s.key === key)?.value ?? fallback;

  const appStatus = useMemo(() => {
    const openingTime = getSetting('opening_time', '08:00');
    const closingTime = getSetting('closing_time', '23:00');
    const storeStatus = getSetting('store_status');
    return getAppStatus(openingTime, closingTime, storeStatus);
  }, [uiSettings]);

  const restaurantStatus = useMemo(() => {
    if (!restaurant) return null;
    return getRestaurantStatus(restaurant);
  }, [restaurant]);

  const canPlaceOrder = appStatus.isOpen && (restaurantStatus === null || restaurantStatus.isOpen);

  const showCouponBoxAlways = getSetting('show_coupon_box_always', 'true') !== 'false';
  const couponMinOrderValue = parseFloat(getSetting('coupon_min_order_value', '0') || '0');
  const showCouponBox = showCouponBoxAlways || (couponMinOrderValue > 0 && subtotal >= couponMinOrderValue);
  const showPaymentCards = getSetting('show_payment_cards', 'true') !== 'false';
  const showCashPayment = getSetting('show_cash_payment', 'true') !== 'false';
  const showBankTransfer = getSetting('show_bank_transfer', 'false') === 'true';
  const checkoutButtonText = getSetting('cart_checkout_button_text', 'إتمام الطلب');
  const checkoutNote = getSetting('cart_checkout_note', '');
  const appName = getSetting('app_name', 'الصايدي توصيل');

  const availablePaymentMethods = useMemo(() => {
    const methods: { value: string; icon: string; label: string }[] = [];

    if (showCashPayment) {
      methods.push({ value: 'cash', icon: '💵', label: 'نقداً' });
    }

    if (showPaymentCards) {
      if (paymentMethods.length > 0) {
        paymentMethods
          .filter((m: any) => m.isActive && m.type !== 'cash' && m.type !== 'bank_transfer')
          .forEach((m: any) => {
            const iconMap: Record<string, string> = {
              mada: '🏦', stc_pay: '📱', apple_pay: '🍎',
              visa: '💳', mastercard: '💳', tabby: '📊',
              tamara: '📈', wallet: '👛', online: '🌐',
            };
            methods.push({
              value: m.provider || m.type,
              icon: iconMap[m.provider] || '💳',
              label: m.name || m.provider,
            });
          });
      } else {
        methods.push({ value: 'card', icon: '💳', label: 'بطاقة دفع' });
        methods.push({ value: 'wallet', icon: '👛', label: 'المحفظة' });
        methods.push({ value: 'online', icon: '🌐', label: 'دفع إلكتروني' });
      }
    }

    if (showBankTransfer) {
      methods.push({ value: 'bank_transfer', icon: '🏛️', label: 'تحويل بنكي' });
    }

    return methods;
  }, [paymentMethods, showCashPayment, showPaymentCards, showBankTransfer]);

  useEffect(() => {
    if (items.length === 0) {
      setDeliveryInfo(null);
      setDeliveryFee(0);
      return;
    }

    const calculateFee = async () => {
      if (userLocation.position) {
        setCalculatingFee(true);
        try {
          const response = await apiRequest('POST', '/api/delivery-fees/calculate', {
            customerLat: userLocation.position.coords.latitude,
            customerLng: userLocation.position.coords.longitude,
            restaurantId: restaurantId,
            orderSubtotal: subtotal
          });
          const result = await response.json();
          if (result.success) {
            setDeliveryFee(result.fee);
            setDeliveryInfo({
              distance: result.distance,
              estimatedTime: result.estimatedTime,
              isFreeDelivery: result.isFreeDelivery
            });
          }
        } catch {
          setDeliveryFee(5);
        } finally {
          setCalculatingFee(false);
        }
      } else {
        getCurrentLocation();
        fetch('/api/delivery-fees/settings')
          .then(res => res.json())
          .then(data => {
            if (data && (data.minFee || data.baseFee)) {
              const fee = parseFloat(data.minFee || data.baseFee || '5');
              setDeliveryFee(fee > 0 ? fee : 5);
            } else {
              setDeliveryFee(5);
            }
          })
          .catch(() => setDeliveryFee(5));
      }
    };

    calculateFee();
  }, [userLocation.position, subtotal, restaurantId]);

  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponData, setCouponData] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    setCouponDiscount(0);
    setCouponData(null);
    try {
      const categoryIds = [...new Set(items.map((i: any) => i.categoryId).filter(Boolean))];
      const res = await apiRequest('POST', '/api/coupons/validate', {
        code: couponCode.trim().toUpperCase(),
        orderValue: subtotal,
        categoryIds,
        restaurantId: items[0]?.restaurantId || restaurantId,
      });
      const data = await res.json();
      if (data.valid) {
        setCouponData(data.coupon);
        setCouponDiscount(data.discount || 0);
        toast({ title: "تم تطبيق الكوبون", description: `وفّرت ${formatCurrency(data.discount || 0)}` });
      } else {
        setCouponError(data.message || "كوبون غير صالح");
      }
    } catch {
      setCouponError("خطأ في التحقق من الكوبون");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponDiscount(0);
    setCouponData(null);
    setCouponError('');
  };

  const totalDiscountAmount = couponDiscount + appliedOfferDiscount.amount;
  const finalTotal = Math.max(0, total - totalDiscountAmount);

  const [orderForm, setOrderForm] = useState({
    customerName: user?.name || user?.username || localStorage.getItem('customer_name') || '',
    customerPhone: user?.phone || localStorage.getItem('customer_phone') || '',
    customerEmail: user?.email || localStorage.getItem('customer_email') || '',
    deliveryAddress: user?.address || '',
    notes: '',
    paymentMethod: availablePaymentMethods[0]?.value || 'cash',
  });

  useEffect(() => {
    if (user) {
      setOrderForm(prev => ({
        ...prev,
        customerName: prev.customerName || user.name || user.username || localStorage.getItem('customer_name') || '',
        customerPhone: prev.customerPhone || user.phone || localStorage.getItem('customer_phone') || '',
        customerEmail: prev.customerEmail || (user as any).email || localStorage.getItem('customer_email') || '',
        deliveryAddress: prev.deliveryAddress || user.address || '',
      }));
    }
  }, [user]);

  useEffect(() => {
    if (availablePaymentMethods.length > 0) {
      const currentValid = availablePaymentMethods.find(m => m.value === orderForm.paymentMethod);
      if (!currentValid) {
        setOrderForm(prev => ({ ...prev, paymentMethod: availablePaymentMethods[0].value }));
      }
    }
  }, [availablePaymentMethods]);

  const placeOrderMutation = useMutation({
    mutationFn: async (orderData: InsertOrder) => {
      const response = await apiRequest('POST', '/api/orders', orderData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "تم تأكيد طلبك بنجاح!", description: "سيتم التواصل معك قريباً" });
      clearCart();
      if (data?.order?.id) {
        setLocation(`/order-tracking/${data.order.id}`);
      } else {
        setLocation('/');
      }
    },
    onError: (error: any) => {
      const raw = error?.message || '';
      const serverMsg = raw.includes(':') ? raw.split(':').slice(1).join(':').trim() : raw;
      let displayMsg = "يرجى المحاولة مرة أخرى";
      let errorCode = "";
      
      try {
        const parsed = JSON.parse(serverMsg);
        displayMsg = parsed.error || parsed.message || displayMsg;
        errorCode = parsed.code || "";
      } catch {
        if (serverMsg) displayMsg = serverMsg;
      }
      
      if (errorCode === "APP_CLOSED") {
        setAppClosedMessage(displayMsg);
        setShowAppClosedOverlay(true);
        return;
      }

      if (
        errorCode === "OUT_OF_DELIVERY_ZONE" ||
        displayMsg.includes("خارج نطاق التوصيل") ||
        displayMsg.includes("خارج مناطق وأحياء التوصيل")
      ) {
        setOutOfZoneReason(displayMsg);
        setShowOutOfZoneModal(true);
        return;
      }
      
      toast({ title: "خطأ في تأكيد الطلب", description: displayMsg, variant: "destructive" });
    },
  });

  const handlePlaceOrder = () => {
    if (!canPlaceOrder) {
      if (!appStatus.isOpen) {
        setAppClosedMessage(appStatus.message);
        setShowAppClosedOverlay(true);
      } else {
        toast({
          title: "المطعم مغلق",
          description: restaurantStatus?.message || 'المطعم مغلق حالياً، يرجى تجربة مطعم آخر أو المحاولة لاحقاً',
          variant: "destructive",
        });
      }
      return;
    }

    if (!orderForm.customerName || !orderForm.customerPhone || !orderForm.deliveryAddress) {
      toast({ title: "معلومات ناقصة", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    if (items.length === 0) {
      toast({ title: "السلة فارغة", description: "أضف بعض العناصر قبل تأكيد الطلب", variant: "destructive" });
      return;
    }

    const orderData: any = {
      orderNumber: `ORD${Date.now()}`,
      customerName: orderForm.customerName,
      customerPhone: (user?.phone || orderForm.customerPhone).trim(),
      customerEmail: orderForm.customerEmail || undefined,
      customerId: user?.id || undefined,
      deliveryAddress: orderForm.deliveryAddress,
      notes: orderForm.notes || undefined,
      paymentMethod: orderForm.paymentMethod,
      items: JSON.stringify(items),
      subtotal: subtotal.toString(),
      deliveryFee: deliveryFee.toString(),
      total: finalTotal.toString(),
      totalAmount: finalTotal.toString(),
      restaurantId: items[0]?.restaurantId || undefined,
      customerLocationLat: (userLocation.position?.coords?.latitude != null)
        ? parseFloat(userLocation.position.coords.latitude.toFixed(8)).toString()
        : undefined,
      customerLocationLng: (userLocation.position?.coords?.longitude != null)
        ? parseFloat(userLocation.position.coords.longitude.toFixed(8)).toString()
        : undefined,
      status: 'pending',
      appliedOfferId: appliedOfferDiscount.offer?.id || undefined,
      offerDiscountAmount: appliedOfferDiscount.amount > 0 ? appliedOfferDiscount.amount.toString() : undefined,
      couponCode: couponDiscount > 0 ? couponCode.trim().toUpperCase() : undefined,
      couponDiscountAmount: couponDiscount > 0 ? couponDiscount.toString() : undefined,
      couponDiscount: couponDiscount > 0 ? couponDiscount.toString() : undefined,
      couponId: couponDiscount > 0 && couponData ? couponData.id : undefined,
    };

    if (orderData.customerPhone) {
      try { localStorage.setItem('customer_phone', orderData.customerPhone); } catch (_) {}
    }

    placeOrderMutation.mutate(orderData);
  };

  const parsePrice = (price: string | number): number => {
    if (typeof price === 'number') return price;
    const num = parseFloat(price);
    return isNaN(num) ? 0 : num;
  };

  return (
    <div className="min-h-screen bg-[#F4F8FF] pb-24" dir="rtl">
      {/* رأس سلة الصايدي توصيل */}
      <header className="relative bg-gradient-to-br from-[#0B5ED7] via-[#0950BA] to-[#003B99] text-white px-4 pt-4 pb-8 rounded-b-[2.25rem] shadow-lg overflow-hidden">
        <div className="absolute -bottom-1 left-0 right-0 h-2.5 bg-gradient-to-r from-[#FF6B00] via-[#FF8533] to-[#FF6B00]" />
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/')}
              data-testid="button-cart-back"
              className="rounded-full bg-white/15 hover:bg-white/25 text-white"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-xl font-black flex items-center gap-2">
                <span>سلة الطلبات</span>
                {items.length > 0 && (
                  <span className="bg-[#FF6B00] text-white text-xs px-2 py-0.5 rounded-full font-black">
                    {items.length}
                  </span>
                )}
              </h2>
              <p className="text-blue-100 text-xs font-semibold">مراجعة طلبك قبل إتمامه • {appName}</p>
            </div>
          </div>
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCart}
              className="text-white bg-white/15 hover:bg-white/25 rounded-full text-xs font-bold gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              مسح الكل
            </Button>
          )}
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* عناصر السلة */}
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="bg-white rounded-3xl border border-blue-100/80 shadow-sm text-center py-12 px-6">
              <div className="w-20 h-20 rounded-3xl bg-[#EEF5FF] border border-blue-100 flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="h-10 w-10 text-[#0B5ED7]" />
              </div>
              <p className="font-black text-slate-900 text-base">السلة فارغة</p>
              <p className="text-xs text-slate-400 mt-1">أضف بعض المنتجات لتبدأ طلبك</p>
              <Button
                onClick={() => setLocation('/')}
                className="mt-5 bg-[#FF6B00] hover:bg-[#E55E00] text-white font-black rounded-full px-7"
              >
                تصفح المتاجر
              </Button>
            </div>
          ) : (
            items.map((item) => (
              <Card key={item.id} className="p-4 rounded-3xl border border-blue-100/80 bg-white shadow-xs flex justify-between items-center gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 rounded-2xl object-cover border border-blue-50 shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-slate-900 text-sm truncate" data-testid={`cart-item-name-${item.id}`}>{item.name}</h4>
                    <p className="text-xs font-black text-[#0B5ED7] mt-0.5">{formatCurrency(item.price)} × {item.quantity}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        size="icon"
                        className="w-8 h-8 rounded-full bg-[#0B5ED7] hover:bg-[#0950BA] text-white shadow-xs"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        data-testid={`button-decrease-${item.id}`}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="px-3 py-1 bg-[#F4F8FF] border border-blue-100 rounded-xl text-sm font-black text-slate-900" data-testid={`quantity-${item.id}`}>
                        {item.quantity}
                      </span>
                      <Button
                        size="icon"
                        className="w-8 h-8 rounded-full bg-[#0B5ED7] hover:bg-[#0950BA] text-white shadow-xs"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        data-testid={`button-increase-${item.id}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600"
                    data-testid={`button-remove-${item.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <span className="font-black text-sm text-slate-900" data-testid={`item-total-${item.id}`}>
                    {formatCurrency(parsePrice(item.price) * item.quantity)}
                  </span>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* ملخص الطلب */}
        {items.length > 0 && (
          <Card className="p-5 rounded-3xl border border-blue-100/80 bg-white shadow-[0_6px_24px_rgba(11,94,215,0.06)]">
            <h3 className="font-black text-slate-900 mb-4 pb-2 border-b border-blue-50">ملخص الطلب</h3>

            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-slate-600 font-bold">المجموع الفرعي</span>
                <span className="text-slate-900 font-black" data-testid="order-subtotal">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-bold">رسوم التوصيل</span>
                <div className="flex flex-col items-end">
                  {calculatingFee ? (
                    <span className="text-xs text-[#0B5ED7] font-bold animate-pulse">جاري الحساب...</span>
                  ) : deliveryFee > 0 ? (
                    <span className="text-slate-900 font-black">{formatCurrency(deliveryFee)}</span>
                  ) : userLocation.position ? (
                    <span className="text-emerald-600 font-black">توصيل مجاني</span>
                  ) : (
                    <span className="text-rose-500 text-xs font-bold">يرجى تحديد الموقع للحساب</span>
                  )}
                </div>
              </div>

              {deliveryInfo && (
                <div className="flex items-center justify-between py-2 px-3 bg-[#F4F8FF] rounded-xl text-xs">
                  <span className="text-slate-600 font-bold">المسافة: {deliveryInfo.distance} كم</span>
                  <span className="text-[#0B5ED7] font-black">⏱ {deliveryInfo.estimatedTime}</span>
                </div>
              )}

              {userLocation.error && (
                <div className="bg-rose-50 p-2.5 rounded-xl text-xs text-rose-600 font-bold flex items-center gap-2 mt-1">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {userLocation.error}
                </div>
              )}

              {!userLocation.position && !userLocation.isLoading && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 text-xs h-10 rounded-full bg-[#EEF5FF] hover:bg-blue-100 border-blue-200 text-[#0B5ED7] font-black"
                  onClick={getCurrentLocation}
                >
                  <MapPin className="h-3.5 w-3.5 ml-2" />
                  تحديد موقعي الآن لحساب التوصيل تلقائياً
                </Button>
              )}

              {userLocation.isLoading && (
                <div className="text-center py-2">
                  <span className="text-xs text-[#0B5ED7] font-bold animate-pulse">جاري جلب موقعك الحالي...</span>
                </div>
              )}

              {/* صندوق الكوبون بتصميم الصايدي توصيل */}
              {showCouponBox && (
                <div className="border-t border-dashed border-blue-200 pt-3 mt-2">
                  {couponData ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl p-3 mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        <div>
                          <p className="text-sm font-black text-emerald-700">{couponData.nameAr || couponCode}</p>
                          <p className="text-xs text-emerald-600 font-bold">خصم {formatCurrency(couponDiscount)}</p>
                        </div>
                      </div>
                      <button onClick={handleRemoveCoupon} className="text-rose-400 hover:text-rose-600">
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#0B5ED7] border border-dashed border-blue-300 bg-[#F4F8FF] px-3 py-2 rounded-full shrink-0">
                          <Tag className="h-3.5 w-3.5" />
                          استخدام كود خصم
                        </span>
                        <Input
                          value={couponCode}
                          onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                          placeholder="أدخل كود الخصم"
                          className="font-mono text-sm h-10 rounded-full bg-[#F4F8FF] border-blue-100 focus:bg-white focus:border-[#0B5ED7]"
                          onKeyDown={(e) => e.key === 'Enter' && handleValidateCoupon()}
                          dir="ltr"
                        />
                        <Button
                          type="button"
                          size="icon"
                          onClick={handleValidateCoupon}
                          disabled={couponLoading || !couponCode.trim()}
                          className="h-10 w-10 rounded-full bg-[#0B5ED7] hover:bg-[#0950BA] text-white shrink-0"
                        >
                          {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                      </div>
                      {couponError && <p className="text-xs text-rose-500 font-bold flex items-center gap-1"><XCircle className="h-3 w-3" />{couponError}</p>}
                    </div>
                  )}
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600 font-bold mb-1">
                      <span>خصم الكوبون</span>
                      <span>- {formatCurrency(couponDiscount)}</span>
                    </div>
                  )}
                </div>
              )}

              {appliedOfferDiscount.amount > 0 && appliedOfferDiscount.offer && (
                <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-2xl p-3 my-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎁</span>
                    <div>
                      <p className="text-sm font-black text-[#FF6B00]">{appliedOfferDiscount.offer.title}</p>
                      <p className="text-xs text-orange-600 font-medium">
                        خصم تلقائي {appliedOfferDiscount.offer.discountPercent ? `${appliedOfferDiscount.offer.discountPercent}%` : `${formatCurrency(appliedOfferDiscount.offer.discountAmount)}`}
                        {appliedOfferDiscount.offer.discountScope === 'section' ? ' على القسم المحدد' : ' على كامل الطلب'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[#FF6B00] font-black text-sm">- {formatCurrency(appliedOfferDiscount.amount)}</span>
                </div>
              )}

              <div className="flex justify-between items-center font-black bg-[#EEF5FF] rounded-2xl px-4 py-3 mt-2">
                <span className="text-slate-900">المجموع الكلي</span>
                <span className="text-[#FF6B00] text-xl" data-testid="order-total">{formatCurrency(finalTotal)}</span>
              </div>
            </div>

            {/* نموذج الطلب */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="customerName" className="text-slate-800 font-bold text-xs mb-1 block">الاسم *</Label>
                <Input
                  id="customerName"
                  value={orderForm.customerName}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="أدخل اسمك"
                  data-testid="input-customer-name"
                  className="h-12 rounded-2xl border-blue-100 bg-[#F4F8FF] focus:bg-white focus:border-[#0B5ED7]"
                />
              </div>

              <div>
                <Label htmlFor="customerPhone" className="text-slate-800 font-bold text-xs mb-1 block">رقم الهاتف *</Label>
                <Input
                  id="customerPhone"
                  value={orderForm.customerPhone}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                  placeholder="أدخل رقم هاتفك"
                  data-testid="input-customer-phone"
                  className="h-12 rounded-2xl border-blue-100 bg-[#F4F8FF] focus:bg-white focus:border-[#0B5ED7]"
                />
              </div>

              <div>
                <Label htmlFor="customerEmail" className="text-slate-800 font-bold text-xs mb-1 block">البريد الإلكتروني</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={orderForm.customerEmail}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, customerEmail: e.target.value }))}
                  placeholder="أدخل بريدك الإلكتروني (اختياري)"
                  data-testid="input-customer-email"
                  className="h-12 rounded-2xl border-blue-100 bg-[#F4F8FF] focus:bg-white focus:border-[#0B5ED7]"
                />
              </div>

              <div>
                <Label htmlFor="deliveryAddress" className="text-slate-800 font-bold text-xs mb-1 block">عنوان التوصيل *</Label>
                <Input
                  id="deliveryAddress"
                  value={orderForm.deliveryAddress}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                  placeholder="أدخل عنوانك بالتفصيل"
                  data-testid="input-delivery-address"
                  className="h-12 rounded-2xl border-blue-100 bg-[#F4F8FF] focus:bg-white focus:border-[#0B5ED7]"
                />
              </div>

              <div>
                <Label htmlFor="notes" className="text-slate-800 font-bold text-xs mb-1 block">ملاحظات الطلب</Label>
                <Textarea
                  id="notes"
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="ملاحظات إضافية (اختياري)"
                  className="h-20 resize-none rounded-2xl border-blue-100 bg-[#F4F8FF] focus:bg-white focus:border-[#0B5ED7]"
                  data-testid="input-notes"
                />
              </div>

              {availablePaymentMethods.length > 0 && (
                <div>
                  <Label className="text-slate-800 font-bold text-xs mb-1 block">طريقة الدفع</Label>
                  <RadioGroup
                    value={orderForm.paymentMethod}
                    onValueChange={(value) => setOrderForm(prev => ({ ...prev, paymentMethod: value }))}
                    className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2"
                  >
                    {availablePaymentMethods.map((method) => (
                      <div
                        key={method.value}
                        className={`flex flex-col items-center justify-center p-3 border-2 rounded-2xl transition-all ${
                          orderForm.paymentMethod === method.value
                            ? 'border-[#0B5ED7] bg-[#EEF5FF] text-[#0B5ED7]'
                            : 'border-blue-50 bg-[#F4F8FF]'
                        }`}
                      >
                        <RadioGroupItem value={method.value} id={method.value} className="sr-only" />
                        <Label htmlFor={method.value} className="flex flex-col items-center gap-1.5 cursor-pointer w-full h-full">
                          <span className="text-2xl">{method.icon}</span>
                          <span className="text-[11px] font-black text-center">{method.label}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}
            </div>

            {!canPlaceOrder && (
              <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-red-700 text-sm">
                    {!appStatus.isOpen ? 'التطبيق مغلق حالياً' : 'المتجر مغلق حالياً'}
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
                    {!appStatus.isOpen ? appStatus.message : restaurantStatus?.message}
                  </p>
                  <p className="text-xs text-red-500 mt-1 font-bold">
                    أوقات العمل: {appStatus.openingTime} - {appStatus.closingTime}
                  </p>
                </div>
              </div>
            )}

            <Button
              onClick={handlePlaceOrder}
              disabled={placeOrderMutation.isPending || calculatingFee}
              className="w-full h-14 mt-6 rounded-full bg-[#FF6B00] hover:bg-[#E55E00] text-white text-lg font-black shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
              data-testid="button-place-order"
            >
              {placeOrderMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> جاري تأكيد الطلب...
                </span>
              ) : calculatingFee ? (
                'جاري حساب رسوم التوصيل...'
              ) : (
                <>
                  <span>{checkoutButtonText}</span>
                  <ChevronLeft className="h-5 w-5" />
                </>
              )}
            </Button>

            {checkoutNote && (
              <p className="text-center text-xs text-slate-400 mt-2">{checkoutNote}</p>
            )}
          </Card>
        )}
      </section>

      {showAppClosedOverlay && (
        <AppClosedOverlay
          openingTime={getSetting('opening_time', '08:00')}
          closingTime={getSetting('closing_time', '23:00')}
          message={appClosedMessage}
          scheduledOrdersEnabled={false}
          onClose={() => setShowAppClosedOverlay(false)}
          onScheduleOrder={undefined}
        />
      )}

      <OutOfDeliveryZoneModal
        isOpen={showOutOfZoneModal}
        onClose={() => setShowOutOfZoneModal(false)}
        onChangeLocation={() => {
          setShowOutOfZoneModal(false);
          const locationEl = document.getElementById('delivery-address-input');
          if (locationEl) {
            locationEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            locationEl.focus();
          }
        }}
        reason={outOfZoneReason}
      />
    </div>
  );
}
