import { useState, useEffect, useMemo } from 'react';
import { useLocation as useWouterLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, Trash2, MapPin, Calendar, DollarSign, Plus, Minus, ShoppingCart, AlertCircle, WifiOff, ShoppingBag, ChevronLeft } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { LocationPicker, LocationData } from '@/components/LocationPicker';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import AppClosedOverlay from '@/components/AppClosedOverlay';
import OutOfDeliveryZoneModal from '@/components/OutOfDeliveryZoneModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCart } from '../context/CartContext';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { apiRequest } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/utils';
import { useUserLocation } from '@/context/LocationContext';
import type { Restaurant } from '@shared/schema';
import { getAppStatus, getRestaurantStatus } from '@/utils/restaurantHours';

export default function Cart() {
  const [, setLocation] = useWouterLocation();
  const { t, language, isRTL } = useLanguage();
  const { state, removeItem, updateQuantity, clearCart, setDeliveryFee } = useCart();
  const { items, subtotal, total, deliveryFee, restaurantId } = state;
  const { toast } = useToast();
  const { user } = useAuth();
  const { location: userLocation } = useUserLocation();
  const { isOnline } = useNetworkStatus();

  const [showConfirmOrder, setShowConfirmOrder] = useState(false);
  const [showAppClosedOverlay, setShowAppClosedOverlay] = useState(false);
  const [showOutOfZoneModal, setShowOutOfZoneModal] = useState(false);
  const [outOfZoneReason, setOutOfZoneReason] = useState('');
  const [isOutsideZone, setIsOutsideZone] = useState(false);

  const [orderForm, setOrderForm] = useState({
    customerName: user?.name || user?.username || localStorage.getItem('customer_name') || '',
    customerPhone: user?.phone || localStorage.getItem('customer_phone') || '',
    customerEmail: user?.email || localStorage.getItem('customer_email') || '',
    deliveryAddress: user?.address || '',
    notes: '',
    paymentMethod: 'cash',
    deliveryTime: 'now',
    locationData: null as LocationData | null,
  });

  useEffect(() => {
    if (user) {
      setOrderForm(prev => ({
        ...prev,
        customerName: prev.customerName || user.name || user.username || localStorage.getItem('customer_name') || '',
        customerPhone: prev.customerPhone || user.phone || localStorage.getItem('customer_phone') || '',
        customerEmail: prev.customerEmail || user.email || localStorage.getItem('customer_email') || '',
        deliveryAddress: prev.deliveryAddress || user.address || '',
      }));
    }
  }, [user]);

  useEffect(() => {
    if (userLocation.position && !orderForm.locationData) {
      const location = {
        lat: userLocation.position.coords.latitude,
        lng: userLocation.position.coords.longitude,
        address: language === 'ar' ? 'موقعي الحالي' : 'My Current Location'
      };
      handleLocationSelect(location);
    }
  }, [userLocation.position, language]);

  const { data: restaurant } = useQuery<Restaurant>({
    queryKey: [`/api/restaurants/${restaurantId}`],
    enabled: !!restaurantId,
  });

  const { data: settings, refetch: refetchSettings } = useQuery<any[]>({
    queryKey: ['/api/ui-settings'],
    refetchInterval: 60000,
  });

  const { data: activePaymentMethods = [], refetch: refetchPaymentMethods } = useQuery<any[]>({
    queryKey: ['/api/admin/payment-methods'],
    select: (data) => (data || []).filter((m: any) => m.isActive !== false),
  });

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let ws: WebSocket | null = null;
    let reconnectTimeout: any;
    const connect = () => {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'settings_changed' || data.type === 'settings_update') {
            refetchSettings();
            refetchPaymentMethods();
          }
        } catch {}
      };
      ws.onclose = () => { reconnectTimeout = setTimeout(connect, 5000); };
      ws.onerror = () => ws?.close();
    };
    connect();
    return () => {
      clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, [refetchSettings, refetchPaymentMethods]);

  const appStatus = useMemo(() => {
    const openingTime = (settings as any[])?.find((s: any) => s.key === 'opening_time')?.value || '08:00';
    const closingTime = (settings as any[])?.find((s: any) => s.key === 'closing_time')?.value || '23:00';
    const storeStatus = (settings as any[])?.find((s: any) => s.key === 'store_status')?.value;
    return getAppStatus(openingTime, closingTime, storeStatus);
  }, [settings]);

  const restaurantStatus = useMemo(() => {
    if (!restaurant) return null;
    return getRestaurantStatus(restaurant);
  }, [restaurant]);

  const canPlaceOrder = appStatus.isOpen && (restaurantStatus === null || restaurantStatus.isOpen);

  const handleLocationSelect = async (location: LocationData) => {
    setOrderForm(prev => ({
      ...prev,
      deliveryAddress: location.address,
      locationData: location,
    }));

    if (location.lat && location.lng) {
      try {
        const response = await apiRequest('POST', '/api/delivery-fees/calculate', {
          customerLat: location.lat,
          customerLng: location.lng,
          restaurantId: restaurantId || null,
          orderSubtotal: subtotal
        });
        
        const data = await response.json();
        
        if (data.success) {
          setDeliveryFee(data.fee);

          if (data.isOutsideDeliveryZone) {
            setIsOutsideZone(true);
            setOutOfZoneReason(data.outsideReason || (language === 'ar' ? 'الموقع المحدد خارج نطاق ومناطق التوصيل المعتمدة لدينا.' : 'Selected location is outside our approved delivery zones.'));
            setShowOutOfZoneModal(true);
          } else {
            setIsOutsideZone(false);
            setOutOfZoneReason('');
            toast({
              title: language === 'ar' ? "تم تحديث رسوم التوصيل" : "Delivery fee updated",
              description: language === 'ar' ? `المسافة: ${(Number(data?.distance) || 0).toFixed(1)} كم، الرسوم: ${formatCurrency(data?.fee || 0)}` : `Distance: ${(Number(data?.distance) || 0).toFixed(1)} km, Fee: ${formatCurrency(data?.fee || 0)}`,
            });
          }
        }
      } catch (error) {
        console.error('Error calculating delivery fee:', error);
        toast({
          title: language === 'ar' ? "خطأ في حساب رسوم التوصيل" : "Error calculating delivery fee",
          description: language === 'ar' ? "حدث خطأ أثناء محاولة حساب رسوم التوصيل، يرجى المحاولة مرة أخرى" : "An error occurred while calculating delivery fee, please try again",
          variant: "destructive"
        });
      }
    }
  };

  const handleChangeLocation = () => {
    setShowOutOfZoneModal(false);
    const locationSection = document.getElementById('delivery-location-section');
    if (locationSection) {
      locationSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => {
      const pickerBtn = document.querySelector('[data-testid="button-location-picker"]') as HTMLButtonElement;
      if (pickerBtn) {
        pickerBtn.click();
      }
    }, 250);
  };

  const placeOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      if (!isOnline) {
        throw new Error(language === 'ar' ? 'لا يوجد اتصال بالإنترنت. يرجى التحقق من الاتصال والمحاولة مرة أخرى.' : 'No internet connection. Please check your connection and try again.');
      }
      const response = await apiRequest('POST', '/api/orders', orderData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: `✅ ${t('order_placed_toast')}`,
        description: t('contact_soon'),
      });
      
      localStorage.setItem('customer_phone', orderForm.customerPhone);
      localStorage.setItem('customer_name', orderForm.customerName);
      if (orderForm.customerEmail) {
        localStorage.setItem('customer_email', orderForm.customerEmail);
      }
      
      clearCart();
      if (data?.order?.id) {
        setLocation(`/orders/${data.order.id}`);
      } else {
        setLocation('/orders');
      }
    },
    onError: (error: any) => {
      const raw = error?.message || '';
      let displayMsg = language === 'ar' ? 'يرجى المحاولة مرة أخرى' : 'Please try again';
      let serverCode = '';

      if (raw.includes('لا يوجد اتصال') || raw.includes('No internet')) {
        displayMsg = raw;
      } else if (raw.includes(':')) {
        const serverPart = raw.split(':').slice(1).join(':').trim();
        try {
          const parsed = JSON.parse(serverPart);
          displayMsg = parsed.error || parsed.message || serverPart || displayMsg;
          serverCode = parsed.code || '';
        } catch {
          if (serverPart) displayMsg = serverPart;
        }
      }

      if (
        serverCode === 'OUT_OF_DELIVERY_ZONE' ||
        displayMsg.includes('خارج نطاق التوصيل') ||
        displayMsg.includes('خارج مناطق وأحياء التوصيل') ||
        displayMsg.toLowerCase().includes('outside delivery zone')
      ) {
        setIsOutsideZone(true);
        setOutOfZoneReason(displayMsg);
        setShowOutOfZoneModal(true);
        return;
      }

      if (
        serverCode === 'APP_CLOSED' ||
        displayMsg.includes('التطبيق مغلق') ||
        displayMsg.includes('مغلق حالياً') ||
        displayMsg.toLowerCase().includes('closed')
      ) {
        setShowAppClosedOverlay(true);
        return;
      }

      toast({
        title: language === 'ar' ? "خطأ في تأكيد الطلب" : "Error confirming order",
        description: displayMsg,
        variant: "destructive",
      });
    },
  });

  const buildOrderData = () => ({
    customerName: orderForm.customerName,
    customerPhone: orderForm.customerPhone,
    customerEmail: orderForm.customerEmail || undefined,
    customerId: user?.id || undefined,
    deliveryAddress: orderForm.deliveryAddress,
    notes: orderForm.notes || undefined,
    paymentMethod: orderForm.paymentMethod,
    items: JSON.stringify(items),
    subtotal: subtotal.toString(),
    deliveryFee: deliveryFee.toString(),
    total: (subtotal + deliveryFee).toString(),
    totalAmount: (subtotal + deliveryFee).toString(),
    restaurantId: restaurantId || null,
    status: 'pending',
    orderNumber: `ORD${Date.now()}`,
    customerLocationLat: orderForm.locationData?.lat?.toString(),
    customerLocationLng: orderForm.locationData?.lng?.toString(),
    deliveryPreference: 'now',
    scheduledDate: undefined,
    scheduledTimeSlot: undefined,
  });

  const handlePlaceOrder = () => {
    if (!isOnline) {
      toast({
        title: t('no_internet_warning'),
        description: language === 'ar' ? "يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى" : "Please check your network connection and try again",
        variant: "destructive",
      });
      return;
    }

    const isGuest = localStorage.getItem('is_guest') === 'true';
    if (!user || isGuest) {
      toast({
        title: language === 'ar' ? "يجب تسجيل حساب" : "Account Required",
        description: language === 'ar' ? "يرجى تسجيل الدخول أو إنشاء حساب جديد لإتمام الطلب" : "Please login or create an account to place your order",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation('/auth');
      }, 1500);
      return;
    }

    if (!appStatus.isOpen || (restaurantStatus && !restaurantStatus.isOpen)) {
      setShowAppClosedOverlay(true);
      return;
    }

    if (!orderForm.customerName || !orderForm.customerPhone || !orderForm.deliveryAddress) {
      toast({
        title: t('missing_info'),
        description: t('fill_required'),
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: t('cart_is_empty'),
        description: t('add_items_first'),
        variant: "destructive",
      });
      return;
    }

    if (isOutsideZone) {
      setShowOutOfZoneModal(true);
      return;
    }

    setShowConfirmOrder(true);
  };

  const confirmAndPlaceOrder = () => {
    setShowConfirmOrder(false);
    if (isOutsideZone) {
      setShowOutOfZoneModal(true);
      return;
    }
    placeOrderMutation.mutate(buildOrderData());
  };

  const appOpeningTime = (settings as any[])?.find((s: any) => s.key === 'opening_time')?.value || '08:00';
  const appClosingTime = (settings as any[])?.find((s: any) => s.key === 'closing_time')?.value || '23:00';

  const effectiveOpeningTime = (!appStatus.isOpen) 
    ? appOpeningTime 
    : (restaurantStatus?.nextOpenTime || restaurant?.openingTime || '08:00');
  
  const effectiveMessage = (!appStatus.isOpen)
    ? (appStatus.message || (language === 'ar' ? 'التطبيق مغلق حالياً' : 'App is currently closed'))
    : (restaurantStatus?.message || (language === 'ar' ? 'المطعم مغلق حالياً' : 'Store is currently closed'));

  return (
    <div className="min-h-screen bg-[#F4F8FF] pb-24" dir={isRTL ? 'rtl' : 'ltr'}>
      {showAppClosedOverlay && (
        <AppClosedOverlay
          openingTime={effectiveOpeningTime}
          closingTime={appClosingTime}
          message={effectiveMessage}
          onScheduleOrder={undefined}
          onClose={() => setShowAppClosedOverlay(false)}
          scheduledOrdersEnabled={false}
        />
      )}

      <AlertDialog open={showConfirmOrder} onOpenChange={setShowConfirmOrder}>
        <AlertDialogContent className="bg-white rounded-3xl border border-blue-100">
          <AlertDialogHeader>
            <AlertDialogTitle className={isRTL ? "text-right font-black text-slate-900" : "text-left font-black text-slate-900"}>{t('confirm_order_title')}</AlertDialogTitle>
            <AlertDialogDescription className={isRTL ? "text-right text-slate-600" : "text-left text-slate-600"}>
              {t('confirm_order_prompt')} {formatCurrency(subtotal + deliveryFee)}؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 justify-end">
            <AlertDialogCancel className="mt-0 rounded-full border-blue-200 text-[#0B5ED7]">{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmAndPlaceOrder}
              className="bg-[#FF6B00] hover:bg-[#E55E00] text-white rounded-full font-black"
            >
              {t('confirm_and_send')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!isOnline && (
        <div className="bg-red-600 text-white text-center py-2 px-4 flex items-center justify-center gap-2 text-sm font-bold">
          <WifiOff className="h-4 w-4" />
          {t('no_internet_warning')}
        </div>
      )}

      {/* Al-Saidi Curved Hero Header */}
      <div className="relative bg-gradient-to-br from-[#0B5ED7] via-[#0950BA] to-[#003B99] text-white pt-4 pb-8 px-4 rounded-b-[2.25rem] shadow-lg overflow-hidden">
        <div className="absolute -bottom-1 left-0 right-0 h-2.5 bg-gradient-to-r from-[#FF6B00] via-[#FF8533] to-[#FF6B00]" />
        <div className="container mx-auto max-w-5xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLocation('/')}
                className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors backdrop-blur-sm"
                aria-label="رجوع"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-black flex items-center gap-2">
                    <span>{t('my_cart')}</span>
                    {items.length > 0 && (
                      <span className="bg-[#FF6B00] text-white text-xs px-2 py-0.5 rounded-full font-black">
                        {items.length}
                      </span>
                    )}
                  </h1>
                  <p className="text-blue-100 text-xs font-semibold">مراجعة طلبك قبل إتمامه • الصايدي توصيل</p>
                </div>
              </div>
            </div>

            {items.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:text-white bg-white/15 hover:bg-white/25 rounded-full font-bold gap-1.5 transition-colors backdrop-blur-sm"
                onClick={clearCart}
                data-testid="button-clear-cart"
              >
                <Trash2 className="h-4 w-4" /> {t('clear_cart')}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* القسم الأيمن - عناصر السلة والنماذج */}
          <div className="lg:col-span-2 space-y-5">
            {items.length > 0 ? (
              <Card className="rounded-3xl border border-blue-100/80 shadow-[0_6px_24px_rgba(11,94,215,0.06)] overflow-hidden bg-white">
                <CardContent className="p-4 sm:p-5">
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3.5 bg-[#F4F8FF] p-3.5 rounded-2xl border border-blue-100/70">
                        <div className="relative shrink-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-16 h-16 rounded-2xl object-cover border border-blue-100 bg-white"
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-slate-900 text-sm truncate" data-testid={`cart-item-name-${item.id}`}>
                            {item.name}
                          </h4>
                          <p className="text-xs font-black text-[#0B5ED7] mt-1" data-testid={`cart-item-price-${item.id}`}>
                            {formatCurrency(item.price)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="icon"
                            className="w-8 h-8 rounded-full bg-[#0B5ED7] hover:bg-[#0950BA] text-white shadow-xs"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            data-testid={`button-decrease-${item.id}`}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="w-8 text-center text-sm font-black text-slate-900 bg-white border border-blue-100 rounded-xl py-1" data-testid={`cart-item-quantity-${item.id}`}>
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
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 hover:text-rose-600 hover:bg-rose-100 mr-1"
                            onClick={() => removeItem(item.id)}
                            data-testid={`button-remove-${item.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* نموذج معلومات العميل */}
            <Card className="rounded-3xl border border-blue-100/80 shadow-[0_6px_24px_rgba(11,94,215,0.06)] overflow-hidden bg-white">
              <CardContent className="p-4 sm:p-5">
                <h3 className="font-black text-slate-900 mb-3.5 text-sm">{t('customer_info')}</h3>
                <div className="space-y-3">
                  <Input
                    placeholder={t('name_placeholder')}
                    value={orderForm.customerName}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, customerName: e.target.value }))}
                    data-testid="input-customer-name"
                    className="h-12 rounded-2xl border-blue-100 bg-[#F4F8FF] focus:bg-white focus:border-[#0B5ED7]"
                  />
                  <Input
                    placeholder={t('phone_placeholder')}
                    value={orderForm.customerPhone}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                    data-testid="input-customer-phone"
                    className="h-12 rounded-2xl border-blue-100 bg-[#F4F8FF] focus:bg-white focus:border-[#0B5ED7]"
                  />
                  <Input
                    placeholder={t('email_placeholder')}
                    value={orderForm.customerEmail}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, customerEmail: e.target.value }))}
                    data-testid="input-customer-email"
                    className="h-12 rounded-2xl border-blue-100 bg-[#F4F8FF] focus:bg-white focus:border-[#0B5ED7]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* قسم العنوان مع منتقي الموقع */}
            <Card id="delivery-location-section" className="rounded-3xl border border-blue-100/80 shadow-[0_6px_24px_rgba(11,94,215,0.06)] overflow-hidden bg-white">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3.5">
                  <div className="w-8 h-8 rounded-xl bg-[#EEF5FF] text-[#0B5ED7] flex items-center justify-center">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <h3 className="font-black text-slate-900 text-sm">{t('delivery_address_header')}</h3>
                </div>
                
                <div className="mb-3.5">
                  <LocationPicker 
                    onLocationSelect={handleLocationSelect}
                    placeholder={t('pick_location_map')}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">{t('or_manual_address')}</label>
                  <Textarea
                    placeholder={t('manual_address_placeholder')}
                    value={orderForm.deliveryAddress}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                    rows={3}
                    data-testid="input-delivery-address"
                    className="rounded-2xl border-blue-100 bg-[#F4F8FF] focus:bg-white focus:border-[#0B5ED7] focus:ring-[#0B5ED7]"
                  />
                </div>

                {isOutsideZone && (
                  <div className="mt-3 p-4 bg-red-50 border-2 border-red-300 rounded-2xl">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="text-sm font-bold text-red-700 block">
                          {t('location_outside_zone_title')}
                        </span>
                        <p className="text-xs text-red-600 mt-1 leading-relaxed">
                          {outOfZoneReason || (language === 'ar' ? 'نأسف، موقع التوصيل المحدد يقع خارج نطاق ومناطق التوصيل المعتمدة لدينا حالياً.' : 'Sorry, the selected delivery location is outside our approved zones.')}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleChangeLocation}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold h-9 rounded-full shadow-xs flex items-center gap-1.5"
                            data-testid="button-banner-change-location"
                          >
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{t('change_location_now')}</span>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setShowOutOfZoneModal(true)}
                            className="border-red-300 text-red-700 text-xs font-bold h-9 rounded-full"
                          >
                            {t('view_details')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!isOutsideZone && orderForm.locationData && (
                  <div className="mt-3 p-3.5 bg-[#EEF5FF] border border-blue-200 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#0B5ED7]" />
                      <span className="text-sm font-black text-[#0B5ED7]">{t('location_accurate')}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 font-medium">
                      📍 {t('coordinates')}: {(Number(orderForm?.locationData?.lat) || 0).toFixed(6)}, {(Number(orderForm?.locationData?.lng) || 0).toFixed(6)}
                    </p>
                    <p className="text-xs text-slate-600 font-medium">
                      {t('accurate_delivery_msg')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ملاحظات الطلب */}
            <Card className="rounded-3xl border border-blue-100/80 shadow-[0_6px_24px_rgba(11,94,215,0.06)] overflow-hidden bg-white">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#FF6B00] flex items-center justify-center">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <h3 className="font-black text-slate-900 text-sm">{t('order_notes_title')}</h3>
                </div>
                <Textarea
                  placeholder={t('order_notes_placeholder')}
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  data-testid="input-order-notes"
                  className="rounded-2xl border-blue-100 bg-[#F4F8FF] focus:bg-white focus:border-[#0B5ED7]"
                />
              </CardContent>
            </Card>
          </div>

          {/* القسم الأيسر - ملخص الطلب والدفع */}
          <div className="space-y-5">
            {/* طرق الدفع */}
            <Card className="rounded-3xl border border-blue-100/80 shadow-[0_6px_24px_rgba(11,94,215,0.06)] overflow-hidden bg-white">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-[#EEF5FF] text-[#0B5ED7] flex items-center justify-center">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <h3 className="font-black text-slate-900 text-sm">{t('payment_method_title')}</h3>
                </div>

                <RadioGroup 
                  value={orderForm.paymentMethod} 
                  onValueChange={(value) => setOrderForm(prev => ({ ...prev, paymentMethod: value }))}
                  className="space-y-2.5"
                >
                  {activePaymentMethods.length > 0 ? (
                    activePaymentMethods.map((method: any) => (
                      <div key={method.id} className="flex items-center space-x-2 rtl:space-x-reverse border border-blue-100 bg-[#F4F8FF] rounded-2xl p-3 cursor-pointer hover:bg-[#EEF5FF] hover:border-[#0B5ED7] transition-all">
                        <RadioGroupItem value={method.provider || method.id} id={`pm-${method.id}`} />
                        <Label htmlFor={`pm-${method.id}`} className="flex-1 cursor-pointer flex items-center gap-2 font-black text-xs text-slate-800">
                          <span className="text-lg">
                            {method.type === 'cash' ? '💵' : method.type === 'wallet' ? '👜' : method.type === 'card' ? '💳' : '🏦'}
                          </span>
                          <span>{language === 'en' ? (method.nameEn || method.name || method.nameAr) : (method.nameAr || method.name)}</span>
                        </Label>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse border border-blue-100 bg-[#F4F8FF] rounded-2xl p-3 cursor-pointer hover:bg-[#EEF5FF] hover:border-[#0B5ED7] transition-all">
                        <RadioGroupItem value="cash" id="cash" />
                        <Label htmlFor="cash" className="flex-1 cursor-pointer flex items-center gap-2 font-black text-xs text-slate-800">
                          <span className="text-lg">💵</span>
                          <span>{t('cash_on_del')}</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse border border-blue-100 bg-[#F4F8FF] rounded-2xl p-3 cursor-pointer hover:bg-[#EEF5FF] hover:border-[#0B5ED7] transition-all">
                        <RadioGroupItem value="wallet" id="wallet" />
                        <Label htmlFor="wallet" className="flex-1 cursor-pointer flex items-center gap-2 font-black text-xs text-slate-800">
                          <span className="text-lg">👜</span>
                          <span>{t('e_wallet')}</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse border border-blue-100 bg-[#F4F8FF] rounded-2xl p-3 cursor-pointer hover:bg-[#EEF5FF] hover:border-[#0B5ED7] transition-all">
                        <RadioGroupItem value="digital" id="digital" />
                        <Label htmlFor="digital" className="flex-1 cursor-pointer flex items-center gap-2 font-black text-xs text-slate-800">
                          <span className="text-lg">🌐</span>
                          <span>{t('e_payment')}</span>
                        </Label>
                      </div>
                    </>
                  )}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* ملخص الطلب النهائي */}
            <Card className="rounded-3xl border border-blue-100/80 shadow-[0_6px_24px_rgba(11,94,215,0.06)] overflow-hidden bg-white">
              <CardContent className="p-4 sm:p-5">
                <h3 className="font-black text-slate-900 text-sm mb-3 pb-2 border-b border-blue-50">ملخص الطلب</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                    <span>{t('subtotal_label')}</span>
                    <span className="text-sm font-black text-slate-900" data-testid="text-subtotal">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                    <span>{t('delivery_label')}</span>
                    <span className="text-sm font-black text-slate-900" data-testid="text-delivery-fee">
                      {formatCurrency(deliveryFee)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center bg-[#EEF5FF] rounded-2xl px-4 py-3">
                    <span className="text-slate-900 font-black text-sm">{t('total_label')}</span>
                    <span className="text-xl font-black text-[#FF6B00]" data-testid="text-total">
                      {formatCurrency(subtotal + deliveryFee)}
                    </span>
                  </div>
                  
                  <div className="text-[11px] text-slate-400 text-center pt-1">
                    {t('delivery_fee_hint')}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* رسالة إغلاق التطبيق أو المتجر */}
            {items.length > 0 && !canPlaceOrder && (
              <Card className="rounded-3xl border-red-200 bg-red-50 overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-black text-red-700 mb-1 text-xs">
                        {!appStatus.isOpen ? t('app_closed_cart') : t('store_closed_cart')}
                      </p>
                      <p className="text-xs text-red-600">
                        {!appStatus.isOpen ? appStatus.message : restaurantStatus?.message}
                      </p>
                      <p className="text-[11px] text-red-500 mt-1 font-bold">
                        {t('work_hours')}: {appStatus.openingTime} - {appStatus.closingTime}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* زر تأكيد الطلب */}
            {items.length > 0 && (
              <div className="space-y-2">
                <Button 
                  className={`w-full h-14 font-black text-base rounded-full transition-all shadow-lg active:scale-[0.99] flex items-center justify-center gap-2 ${
                    isOutsideZone 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : canPlaceOrder 
                        ? 'bg-[#FF6B00] hover:bg-[#E55E00] text-white shadow-orange-500/25' 
                        : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                  onClick={isOutsideZone ? () => setShowOutOfZoneModal(true) : handlePlaceOrder}
                  disabled={placeOrderMutation.isPending || !orderForm.locationData || !canPlaceOrder}
                  data-testid="button-place-order"
                >
                  {placeOrderMutation.isPending 
                    ? t('confirming_order') 
                    : isOutsideZone
                      ? t('outside_zone_button')
                      : !canPlaceOrder 
                        ? (!appStatus.isOpen ? `🔒 ${t('app_closed_cart')}` : `🔒 ${t('store_closed_cart')}`)
                        : !orderForm.locationData 
                          ? t('select_location_to_continue') 
                          : (
                            <>
                              <span>{t('confirm_order_btn')} - {formatCurrency(total)}</span>
                              <ChevronLeft className="h-5 w-5" />
                            </>
                          )}
                </Button>

                {isOutsideZone && (
                  <p className="text-center text-xs text-red-600 font-medium">
                    {t('outside_zone_warning')}
                  </p>
                )}
              </div>
            )}
            
            {/* رسالة السلة الفارغة */}
            {items.length === 0 && (
              <Card className="rounded-3xl border border-blue-100/80 shadow-[0_6px_24px_rgba(11,94,215,0.06)] overflow-hidden bg-white">
                <CardContent className="p-10 text-center">
                  <div className="text-slate-500">
                    <div className="w-20 h-20 rounded-3xl bg-[#EEF5FF] border border-blue-100 flex items-center justify-center mx-auto mb-4 text-[#0B5ED7]">
                      <ShoppingCart className="h-10 w-10 text-[#0B5ED7]" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 mb-1">{t('cart_is_empty')}</h3>
                    <p className="text-xs text-slate-400 font-bold">{t('empty_cart_message')}</p>
                    <Button 
                      className="mt-5 bg-[#FF6B00] hover:bg-[#E55E00] text-white font-black rounded-full px-7 py-2.5 shadow-md shadow-orange-500/25"
                      onClick={() => setLocation('/')}
                      data-testid="button-continue-shopping"
                    >
                      {t('browse_food')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <OutOfDeliveryZoneModal
        isOpen={showOutOfZoneModal}
        onClose={() => setShowOutOfZoneModal(false)}
        onChangeLocation={handleChangeLocation}
        reason={outOfZoneReason}
      />
    </div>
  );
}
