import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import {
  Star,
  Heart,
  UtensilsCrossed,
  Menu,
  Tag,
  Clock,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Navigation,
  AlertCircle,
  ShoppingBasket,
  Store,
  Pill,
  Package,
  MoreHorizontal,
  Send,
  Loader2,
  ClipboardList,
  Bike,
  CheckCircle2,
  Phone,
  MessageCircle,
  Search,
  Wallet,
  Calendar,
  XCircle,
  FileText,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import MapComponent from '@/components/maps/MapComponent';
import OutOfDeliveryZoneModal from '@/components/OutOfDeliveryZoneModal';
import { OrderChatModal } from '@/components/OrderChatModal';
import { useUiSettings } from '@/context/UiSettingsContext';
import { useUserLocation } from '@/context/LocationContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/utils';
import { safeTriggerPhoneCall } from '@/lib/callUtils';
import type { Category, Restaurant, SpecialOffer } from '@shared/schema';
import { getRestaurantStatus, getAppStatus } from '@/utils/restaurantHours';

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number, language: string): string {
  if (!km || isNaN(km)) return language === 'ar' ? '0 كم' : '0 km';
  if (km < 1) return language === 'ar' ? `${Math.round(km * 1000)} م` : `${Math.round(km * 1000)} m`;
  return language === 'ar' ? `${(Number(km) || 0).toFixed(1)} كم` : `${(Number(km) || 0).toFixed(1)} km`;
}

const FAV_KEY = 'restaurant_favorites';
function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}
function saveFavorites(set: Set<string>) {
  localStorage.setItem(FAV_KEY, JSON.stringify([...set]));
}

const ORDER_TYPES = [
  {
    value: 'طعام',
    label: 'مطاعم ومأكولات',
    icon: UtensilsCrossed,
    tileBg: 'bg-orange-50 text-[#FF6B00]',
    categoryHint: ['مطاعم', 'مأكولات', 'طعام', 'restaurant', 'food'],
  },
  {
    value: 'بقالة',
    label: 'مواد غذائية ومستلزمات',
    icon: ShoppingBasket,
    tileBg: 'bg-blue-50 text-[#0B5ED7]',
    categoryHint: ['بقالة', 'غذائية', 'سوبرماركت', 'grocery'],
  },
  {
    value: 'متاجر ومحلات',
    label: 'متاجر وتسوق',
    icon: Store,
    tileBg: 'bg-indigo-50 text-[#0B5ED7]',
    categoryHint: ['متاجر', 'تسوق', 'محلات', 'store'],
  },
  {
    value: 'أدوية',
    label: 'صيدليات',
    icon: Pill,
    tileBg: 'bg-emerald-50 text-emerald-600',
    categoryHint: ['صيدل', 'أدوية', 'دواء', 'pharmacy'],
  },
  {
    value: 'طرود',
    label: 'طرود وطلبات متنوعة',
    icon: Package,
    tileBg: 'bg-sky-50 text-[#0B5ED7]',
    categoryHint: ['طرود', 'شحن', 'parcel'],
  },
  {
    value: 'أخرى',
    label: 'أخرى',
    icon: MoreHorizontal,
    tileBg: 'bg-slate-100 text-slate-600',
    categoryHint: [],
  },
];

export default function HomePage() {
  const [, setLocation] = useLocation();
  const { getSetting } = useUiSettings();
  const { location: userLocation } = useUserLocation();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  // Primary Home Tabs matching the 3 panels in 800a7534 & e7cf083a
  const [homeMode, setHomeMode] = useState<'new' | 'track' | 'recent'>('new');

  // Storefront browsing state
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTab, setSelectedTab] = useState('all');
  const [offerIndex, setOfferIndex] = useState(0);
  const sliderTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);

  // Quick Delivery Request Form State ("طلب جديد")
  const [quickOrderType, setQuickOrderType] = useState('طعام');
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '');
  const [pickupAddress, setPickupAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [customerName, setCustomerName] = useState(
    user?.name || user?.username || localStorage.getItem('customer_name') || ''
  );
  const [customerPhone, setCustomerPhone] = useState(
    user?.phone || localStorage.getItem('customer_phone') || ''
  );
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [estimatedFee, setEstimatedFee] = useState<number>(() =>
    parseFloat(getSetting('wasalni_base_fee') || '500') || 500
  );
  const [isLocating, setIsLocating] = useState(false);
  const [isMapDialogOpen, setIsMapDialogOpen] = useState(false);
  const [isOutsideZone, setIsOutsideZone] = useState(false);
  const [showOutOfZoneModal, setShowOutOfZoneModal] = useState(false);
  const [outOfZoneReason, setOutOfZoneReason] = useState('');

  // Order Tracking & History State
  const [trackSearch, setTrackSearch] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<any>(null);
  const [isSearchingOrder, setIsSearchingOrder] = useState(false);
  const [selectedActiveOrderId, setSelectedActiveOrderId] = useState<string>('');
  const [recentFilter, setRecentFilter] = useState<'all' | 'active' | 'delivered'>('all');
  const [chatOrder, setChatOrder] = useState<any>(null);

  const getS = (key: string, defaultValue: string) => getSetting(key) || defaultValue;
  const showSection = (key: string) => getSetting(key) !== 'false';

  const appStatus = useMemo(() => {
    const openingTime = getSetting('opening_time') || '08:00';
    const closingTime = getSetting('closing_time') || '23:00';
    const storeStatus = getSetting('store_status') || 'open';
    const storeEmergencyClosed = getSetting('store_emergency_closed', 'false');
    const emergencyMessage = getSetting('store_emergency_message', '');
    const workingDays = getSetting('working_days', '0,1,2,3,4,5,6');
    return getAppStatus(openingTime, closingTime, storeStatus, storeEmergencyClosed, emergencyMessage, workingDays);
  }, [getSetting]);

  useEffect(() => {
    const feeVal = parseFloat(getSetting('wasalni_base_fee') || '500');
    if (!deliveryCoords && !isNaN(feeVal) && feeVal > 0) {
      setEstimatedFee(feeVal);
    }
  }, [getSetting, deliveryCoords]);

  useEffect(() => {
    if (user) {
      setCustomerName((prev) => prev || user.name || user.username || '');
      setCustomerPhone((prev) => prev || user.phone || '');
      setDeliveryAddress((prev) => prev || user.address || '');
    }
  }, [user]);

  const { data: restaurants } = useQuery<Restaurant[]>({ queryKey: ['/api/restaurants'] });
  const { data: categories } = useQuery<Category[]>({ queryKey: ['/api/categories'] });
  const { data: offers } = useQuery<SpecialOffer[]>({ queryKey: ['/api/special-offers'] });

  const activePhone = user?.phone || localStorage.getItem('customer_phone') || customerPhone || '';
  const activeCustomerId = user?.id || '';

  // Fetch customer's real orders + wasalni requests
  const { data: customerOrders = [] } = useQuery<any[]>({
    queryKey: ['orders', activePhone, activeCustomerId],
    enabled: !!(activePhone || activeCustomerId),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeCustomerId) params.set('customerId', activeCustomerId);
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const phoneSegment = activePhone
        ? encodeURIComponent(activePhone)
        : `id:${encodeURIComponent(activeCustomerId)}`;

      const [ordersRes, wasalniRes] = await Promise.all([
        fetch(`/api/orders/customer/${phoneSegment}${queryStr}`),
        activePhone ? fetch(`/api/wasalni?phone=${encodeURIComponent(activePhone)}`) : Promise.resolve(null),
      ]);

      const regular: any[] = ordersRes.ok ? await ordersRes.json() : [];
      let wasalni: any[] = [];
      if (wasalniRes && wasalniRes.ok) {
        try {
          const wData: any[] = await wasalniRes.json();
          wasalni = (wData || []).map((w) => ({
            ...w,
            orderNumber: w.requestNumber,
            deliveryAddress: w.toAddress,
            restaurantName: `${w.orderType || 'طلب توصيل'}`,
            totalAmount: w.estimatedFee || '0',
            _isWasalni: true,
          }));
        } catch {
          wasalni = [];
        }
      }

      return [...regular, ...wasalni].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    refetchInterval: 20000,
  });

  const activeOrdersList = useMemo(
    () => customerOrders.filter((o) => !['delivered', 'cancelled'].includes(o.status)),
    [customerOrders]
  );

  const displayedActiveOrder = useMemo(() => {
    if (searchedOrder) return searchedOrder;
    if (selectedActiveOrderId) {
      return activeOrdersList.find((o) => o.id === selectedActiveOrderId) || activeOrdersList[0] || null;
    }
    return activeOrdersList[0] || null;
  }, [searchedOrder, selectedActiveOrderId, activeOrdersList]);

  const filteredRecentOrders = useMemo(() => {
    return customerOrders.filter((o) => {
      if (recentFilter === 'active') return !['delivered', 'cancelled'].includes(o.status);
      if (recentFilter === 'delivered') return o.status === 'delivered';
      return true;
    });
  }, [customerOrders, recentFilter]);

  const activeOffers = (offers || []).filter((o) => o.isActive);

  const startSlider = useCallback(() => {
    if (sliderTimer.current) clearInterval(sliderTimer.current);
    if (activeOffers.length > 1) {
      sliderTimer.current = setInterval(() => {
        setOfferIndex((prev) => (prev + 1) % activeOffers.length);
      }, 4000);
    }
  }, [activeOffers.length]);

  useEffect(() => {
    startSlider();
    return () => {
      if (sliderTimer.current) clearInterval(sliderTimer.current);
    };
  }, [startSlider]);

  const prevOffer = () => {
    setOfferIndex((prev) => (prev - 1 + activeOffers.length) % activeOffers.length);
    startSlider();
  };
  const nextOffer = () => {
    setOfferIndex((prev) => (prev + 1) % activeOffers.length);
    startSlider();
  };

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveFavorites(next);
      return next;
    });
  };

  // Calculate delivery fee & validate delivery zone
  const calculateDeliveryFeeForCoords = async (lat: number, lng: number) => {
    try {
      const res = await apiRequest('POST', '/api/delivery-fees/calculate', {
        customerLat: lat,
        customerLng: lng,
        restaurantId: null,
        orderSubtotal: 0,
      });
      const data = await res.json();
      if (data.success) {
        if (typeof data.fee === 'number' && data.fee > 0) {
          setEstimatedFee(data.fee);
        }
        if (data.isOutsideDeliveryZone) {
          setIsOutsideZone(true);
          setOutOfZoneReason(
            data.outsideReason || 'الموقع المحدد خارج نطاق ومناطق التوصيل المعتمدة لدينا.'
          );
          setShowOutOfZoneModal(true);
        } else {
          setIsOutsideZone(false);
          setOutOfZoneReason('');
        }
      }
    } catch (err) {
      console.error('Fee calculation error:', err);
    }
  };

  const handleLocateGPS = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'الموقع غير مدعوم',
        description: 'متصفحك لا يدعم تحديد الموقع التلقائي',
        variant: 'destructive',
      });
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setDeliveryCoords({ lat: latitude, lng: longitude });
        await calculateDeliveryFeeForCoords(latitude, longitude);
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=ar`,
            { headers: { 'User-Agent': 'AlSaidiDelivery/1.0' } }
          );
          const data = await response.json();
          if (data?.display_name) {
            const shortAddr = data.display_name.split(',').slice(0, 4).join(' - ').trim();
            setDeliveryAddress(shortAddr);
            toast({ title: 'تم تحديد الموقع بنجاح', description: shortAddr });
          } else {
            setDeliveryAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          }
        } catch {
          setDeliveryAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        toast({
          title: 'تعذر تحديد الموقع',
          description: 'يرجى تفعيل الموقع أو اختياره مباشرة على الخريطة',
          variant: 'destructive',
        });
      },
      { enableHighAccuracy: true, timeout: 9000 }
    );
  };

  const handleMapSelect = async (lat: number, lng: number, address: string) => {
    setDeliveryCoords({ lat, lng });
    setDeliveryAddress(address);
    setIsMapDialogOpen(false);
    await calculateDeliveryFeeForCoords(lat, lng);
    toast({ title: 'تم اختيار الموقع على الخريطة', description: address });
  };

  const validateYemeniPhone = (phone: string) => {
    const normalized = phone
      .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
      .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
      .replace(/\s+/g, '');
    if (!/^\d{9}$/.test(normalized)) {
      return { valid: false, normalized, error: 'رقم الهاتف يجب أن يتكون من 9 أرقام (مثال: 771234567)' };
    }
    if (!/^(77|78|71|70|73)/.test(normalized)) {
      return { valid: false, normalized, error: 'رقم الهاتف يجب أن يبدأ بـ 77 أو 78 أو 71 أو 70 أو 73' };
    }
    return { valid: true, normalized };
  };

  const quickOrderMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/wasalni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'تعذر إرسال الطلب');
      }
      return res.json();
    },
    onSuccess: (data) => {
      localStorage.setItem('customer_name', customerName.trim());
      localStorage.setItem('customer_phone', customerPhone.trim());
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wasalni'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/customer'] });
      toast({
        title: 'تم إرسال طلبك بنجاح',
        description: `رقم الطلب: #${data.request?.requestNumber || ''}`,
      });
      setNotes('');
      if (data.request?.id) {
        setLocation(`/orders/${data.request.id}`);
      } else {
        setHomeMode('track');
      }
    },
    onError: (err: any) => {
      toast({
        title: 'خطأ في إرسال الطلب',
        description: err.message || 'يرجى التحقق من البيانات والمحاولة مرة أخرى',
        variant: 'destructive',
      });
    },
  });

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appStatus.isOpen && getSetting('store_status') === 'closed') {
      toast({
        title: 'التطبيق مغلق حالياً',
        description: appStatus.message || 'لا يمكن استقبال طلبات جديدة الآن',
        variant: 'destructive',
      });
      return;
    }
    if (isOutsideZone) {
      setShowOutOfZoneModal(true);
      return;
    }
    if (!deliveryAddress.trim()) {
      toast({
        title: 'يرجى تحديد عنوان التوصيل',
        description: 'اضغط على (اختر موقع التوصيل على الخريطة) أو أدخل العنوان يدوياً',
        variant: 'destructive',
      });
      return;
    }
    if (!customerName.trim()) {
      toast({
        title: 'الاسم مطلوب',
        description: 'يرجى إدخال اسم المستلم',
        variant: 'destructive',
      });
      return;
    }
    const phoneCheck = validateYemeniPhone(customerPhone);
    if (!phoneCheck.valid) {
      toast({
        title: 'رقم الهاتف غير صحيح',
        description: phoneCheck.error,
        variant: 'destructive',
      });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toTimeString().slice(0, 5);

    quickOrderMutation.mutate({
      customerName: customerName.trim(),
      customerPhone: phoneCheck.normalized,
      customerId: user?.id || undefined,
      fromAddress: pickupAddress.trim() || `طلب ${quickOrderType}`,
      toAddress: deliveryAddress.trim(),
      orderType: quickOrderType,
      notes: notes.trim() || undefined,
      scheduledDate: today,
      scheduledTime: nowTime,
      estimatedFee,
    });
  };

  const handleOrderTypeSelect = (item: (typeof ORDER_TYPES)[number]) => {
    setQuickOrderType(item.value);
    if (categories?.length && item.categoryHint.length > 0) {
      const matched = categories.find((c) =>
        item.categoryHint.some((hint) => c.name.toLowerCase().includes(hint))
      );
      if (matched) {
        setSelectedCategory(matched.id);
        return;
      }
    }
    if (item.value === 'أخرى' || item.value === 'طرود') {
      setSelectedCategory('all');
    }
  };

  const handleSearchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = trackSearch.replace('#', '').trim();
    if (!cleaned) {
      setSearchedOrder(null);
      return;
    }
    setIsSearchingOrder(true);
    try {
      const res = await fetch(`/api/orders/number/${encodeURIComponent(cleaned)}`);
      if (res.ok) {
        setSearchedOrder(await res.json());
      } else {
        const resW = await fetch(`/api/wasalni/number/${encodeURIComponent(cleaned)}`);
        if (resW.ok) {
          const dataW = await resW.json();
          setSearchedOrder({
            ...dataW,
            orderNumber: dataW.requestNumber,
            deliveryAddress: dataW.toAddress,
            restaurantName: dataW.orderType || 'طلب توصيل',
            _isWasalni: true,
          });
        } else {
          toast({
            title: 'طلب غير موجود',
            description: `لم يتم العثور على طلب بالرقم #${cleaned}`,
            variant: 'destructive',
          });
        }
      }
    } catch {
      toast({ title: 'خطأ في البحث', variant: 'destructive' });
    } finally {
      setIsSearchingOrder(false);
    }
  };

  const userLat = userLocation.position?.coords.latitude;
  const userLng = userLocation.position?.coords.longitude;

  const filteredRestaurants = (() => {
    let list = (restaurants || []).filter((r) => {
      if (selectedCategory !== 'all' && r.categoryId !== selectedCategory) return false;
      if (selectedTab === 'newest' && !r.isNew) return false;
      if (selectedTab === 'favorites' && !favorites.has(r.id)) return false;
      return true;
    });

    if (selectedTab === 'nearest' && userLat && userLng) {
      list = list
        .map((r) => ({
          ...r,
          _dist:
            r.latitude && r.longitude
              ? haversineDistance(userLat, userLng, parseFloat(String(r.latitude)), parseFloat(String(r.longitude)))
              : Infinity,
        }))
        .sort((a: any, b: any) => a._dist - b._dist);
    }
    return list;
  })();

  const tabs = [
    { key: 'all', label: language === 'ar' ? getS('btn_tab_all', 'الكل') : 'All' },
    { key: 'nearest', label: language === 'ar' ? getS('btn_tab_nearest', 'الأقرب') : 'Nearest' },
    { key: 'newest', label: language === 'ar' ? getS('btn_tab_new', 'الجديدة') : 'New' },
    { key: 'favorites', label: language === 'ar' ? getS('btn_tab_favorites', 'المفضلة') : t('favorites') },
  ];

  const currentOffer = activeOffers[offerIndex];

  const getOrderStatusMeta = (status: string) => {
    const map: Record<string, { label: string; badgeCls: string; step: number }> = {
      pending: { label: 'قيد المراجعة', badgeCls: 'bg-sky-100 text-[#0B5ED7] border-sky-200', step: 0 },
      scheduled: { label: 'مجدول', badgeCls: 'bg-indigo-100 text-indigo-700 border-indigo-200', step: 0 },
      confirmed: { label: 'تم التأكيد', badgeCls: 'bg-sky-100 text-[#0B5ED7] border-sky-200', step: 0 },
      preparing: { label: 'قيد التجهيز', badgeCls: 'bg-orange-100 text-[#FF6B00] border-orange-200', step: 1 },
      ready: { label: 'جاهز للاستلام', badgeCls: 'bg-orange-100 text-[#FF6B00] border-orange-200', step: 1 },
      picked_up: { label: 'جاري التوصيل', badgeCls: 'bg-blue-100 text-[#0B5ED7] border-blue-200', step: 2 },
      on_way: { label: 'قيد التوصيل', badgeCls: 'bg-amber-100 text-amber-800 border-amber-200', step: 2 },
      delivered: { label: 'تم التسليم', badgeCls: 'bg-emerald-100 text-emerald-700 border-emerald-200', step: 3 },
      cancelled: { label: 'تم إلغاء الطلب', badgeCls: 'bg-slate-200 text-slate-700 border-slate-300', step: -1 },
    };
    return map[status] || { label: status, badgeCls: 'bg-slate-100 text-slate-700 border-slate-200', step: 0 };
  };

  const formatOrderTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const timeStr = d.toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' });
    return isToday ? `اليوم - ${timeStr}` : `${d.toLocaleDateString('ar-YE')} - ${timeStr}`;
  };

  return (
    <div className="min-h-screen bg-[#F4F8FF] pb-24" dir="rtl">
      {/* Working Hours Alert Strip if closed */}
      {!appStatus.isOpen && (
        <div className="max-w-6xl mx-auto px-4 pt-3">
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-2.5 text-rose-800 text-xs font-bold">
            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
            <span>{appStatus.message || 'التطبيق مغلق حالياً، نعود قريباً'}</span>
          </div>
        </div>
      )}

      {/* Top 3-Panel Mode Bar matching screenshots 800a7534 & e7cf083a */}
      <div className="max-w-6xl mx-auto px-4 pt-3">
        <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-white rounded-full border border-blue-100 shadow-xs">
          <button
            type="button"
            onClick={() => setHomeMode('new')}
            className={`h-10 rounded-full text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              homeMode === 'new'
                ? 'bg-gradient-to-r from-[#0B5ED7] to-[#0046B8] text-white shadow-sm'
                : 'text-slate-600 hover:text-[#0B5ED7] hover:bg-blue-50/50'
            }`}
          >
            <Send className="h-3.5 w-3.5 shrink-0" />
            <span>طلب جديد</span>
          </button>

          <button
            type="button"
            onClick={() => setHomeMode('track')}
            className={`h-10 rounded-full text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              homeMode === 'track'
                ? 'bg-gradient-to-r from-[#0B5ED7] to-[#0046B8] text-white shadow-sm'
                : 'text-slate-600 hover:text-[#0B5ED7] hover:bg-blue-50/50'
            }`}
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>متابعة الطلبات</span>
            {activeOrdersList.length > 0 && (
              <span className="bg-[#FF6B00] text-white text-[10px] rounded-full h-[18px] min-w-[18px] px-1 flex items-center justify-center font-black tabular-nums">
                {activeOrdersList.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setHomeMode('recent')}
            className={`h-10 rounded-full text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              homeMode === 'recent'
                ? 'bg-gradient-to-r from-[#0B5ED7] to-[#0046B8] text-white shadow-sm'
                : 'text-slate-600 hover:text-[#0B5ED7] hover:bg-blue-50/50'
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5 shrink-0" />
            <span>أحدث الطلبات</span>
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: طلب جديد + Storefront Browsing                                 */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {homeMode === 'new' && (
        <div className="max-w-6xl mx-auto px-4 pt-3 space-y-5">
          {/* Desktop 2-column grid / Mobile stacked single-scroll */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Quick New Order Card (Matches Panel 1 of 800a7534 & e7cf083a) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Royal Blue Curved Hero Banner */}
              <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#1B72FF] via-[#0B5ED7] to-[#003B99] text-white shadow-[0_12px_32px_rgba(11,94,215,0.22)]">
                {/* Decorative Orange & White Wave */}
                <svg
                  viewBox="0 0 400 44"
                  className="absolute bottom-0 left-0 right-0 w-full h-7 pointer-events-none"
                  preserveAspectRatio="none"
                >
                  <path d="M0,24 Q190,42 400,6 L400,44 L0,44 Z" fill="#FFFFFF" />
                  <path d="M0,18 Q190,36 400,0 L400,8 Q190,42 0,25 Z" fill="#FF6B00" />
                </svg>

                <div className="relative z-10 flex items-center justify-between gap-3 px-5 pt-5 pb-8">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-[26px] font-black leading-tight tracking-tight">
                      طلب جديد
                    </h1>
                    <p className="text-xs sm:text-sm text-blue-100 font-bold mt-1">
                      أطلب الآن بكل سهولة · ونحن نوصل لك
                    </p>
                    <button
                      type="button"
                      onClick={() => setLocation('/wasalni')}
                      className="mt-3 inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/25 text-white text-[11px] font-black px-3.5 py-1.5 rounded-full transition-colors"
                    >
                      <Bike className="h-3.5 w-3.5 text-[#FF9800]" />
                      <span>نموذج التوصيل المخصص الكامل</span>
                      <ChevronLeft className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="relative w-28 h-28 sm:w-32 sm:h-28 shrink-0 rounded-2xl overflow-hidden border-2 border-white/40 shadow-lg bg-white">
                    <img
                      src="/assets/saidi-courier-hero.jpg"
                      alt="مندوب الصايدي توصيل"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-[#FF6B00] text-white flex items-center justify-center shadow">
                      <MapPin className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Type Selector + Delivery Form Card */}
              <form
                onSubmit={handleQuickSubmit}
                className="bg-white rounded-[28px] border border-blue-100/90 shadow-[0_8px_28px_rgba(11,94,215,0.06)] p-4 sm:p-5 space-y-4"
              >
                {/* Section Header: اختر نوع الطلب */}
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-[#003B99] flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-blue-50 text-[#0B5ED7] flex items-center justify-center">
                      <Package className="h-4 w-4" />
                    </span>
                    اختر نوع الطلب
                  </h2>
                  <span className="text-xs font-bold text-[#FF6B00]">
                    {ORDER_TYPES.find((i) => i.value === quickOrderType)?.label}
                  </span>
                </div>

                {/* 6-Tile Order Type Grid (Matches 800a7534 & e7cf083a) */}
                <div className="grid grid-cols-3 gap-2.5">
                  {ORDER_TYPES.map((item) => {
                    const Icon = item.icon;
                    const active = quickOrderType === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => handleOrderTypeSelect(item)}
                        className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center gap-2 min-h-[86px] ${
                          active
                            ? 'border-[#0B5ED7] bg-gradient-to-b from-[#0B5ED7] to-[#0046B8] text-white shadow-md shadow-blue-600/20'
                            : 'border-blue-100/80 bg-[#F4F8FF] text-slate-700 hover:border-blue-300'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            active ? 'bg-white/20 text-white' : item.tileBg
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-[11px] font-black leading-tight line-clamp-2">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Delivery Address Picker */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-[#003B99] flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-blue-50 text-[#0B5ED7] flex items-center justify-center">
                        <MapPin className="h-4 w-4" />
                      </span>
                      عنوان التوصيل
                    </span>
                    <button
                      type="button"
                      onClick={handleLocateGPS}
                      disabled={isLocating}
                      className="inline-flex items-center gap-1 text-xs font-black text-[#0B5ED7] bg-[#EEF5FF] hover:bg-blue-100 px-3 py-1 rounded-full transition-colors"
                    >
                      {isLocating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Navigation className="h-3.5 w-3.5" />
                      )}
                      <span>تحديد موقعي</span>
                    </button>
                  </div>

                  {/* Clickable Map Picker Trigger matching screenshot */}
                  <button
                    type="button"
                    onClick={() => setIsMapDialogOpen(true)}
                    className="w-full h-12 px-4 rounded-2xl bg-[#F4F8FF] hover:bg-blue-50 border border-blue-100 flex items-center justify-between gap-2 text-right transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MapPin className="h-[18px] w-[18px] text-[#FF6B00] shrink-0" />
                      <span className="text-xs sm:text-sm font-bold text-slate-700 truncate">
                        {deliveryAddress || 'اختر موقع التوصيل على الخريطة'}
                      </span>
                    </div>
                    <ChevronLeft className="h-4 w-4 text-[#0B5ED7] shrink-0" />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      placeholder="مكان الاستلام (اسم المتجر أو الحي)"
                      className="h-11 rounded-2xl bg-[#F4F8FF] border-blue-100 focus:bg-white text-xs font-semibold"
                    />
                    <Input
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="تفاصيل عنوان التوصيل *"
                      className="h-11 rounded-2xl bg-[#F4F8FF] border-blue-100 focus:bg-white text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Contact Info (shown cleanly if user hasn't stored phone/name yet) */}
                {(!user || !customerPhone) && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="الاسم الكامل *"
                      className="h-11 rounded-2xl bg-[#F4F8FF] border-blue-100 focus:bg-white text-xs font-semibold"
                    />
                    <Input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="رقم الجوال (77xxxxxxx) *"
                      type="tel"
                      className="h-11 rounded-2xl bg-[#F4F8FF] border-blue-100 focus:bg-white text-xs font-semibold"
                    />
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[#003B99] flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-50 text-[#0B5ED7] flex items-center justify-center">
                      <FileText className="h-3.5 w-3.5" />
                    </span>
                    ملاحظات إضافية (اختياري)
                  </label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أضف أي ملاحظات هنا ..."
                    className="min-h-[74px] rounded-2xl bg-[#F4F8FF] border-blue-100 focus:bg-white resize-none text-xs font-medium"
                  />
                </div>

                {/* Estimated Cost Pill */}
                <div className="bg-[#EEF5FF] border border-blue-200/80 rounded-full px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-[#0B5ED7]" />
                    التكلفة التقديرية للتوصيل
                  </span>
                  <span className="text-sm font-black text-[#0B5ED7] tabular-nums">
                    {formatCurrency(estimatedFee)}
                  </span>
                </div>

                {/* Orange Submit CTA Pill */}
                <Button
                  type="submit"
                  disabled={quickOrderMutation.isPending}
                  className="w-full h-[52px] rounded-full bg-gradient-to-r from-[#FF9800] via-[#FF7300] to-[#FF5500] hover:brightness-105 text-white font-black text-base shadow-[0_10px_24px_rgba(255,107,0,0.3)] flex items-center justify-center gap-2.5 transition-all active:scale-[0.99]"
                >
                  {quickOrderMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>جاري إرسال الطلب...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      <span>إرسال الطلب</span>
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Storefront Browse Column (Preserves 100% of Categories, Offers & Restaurants) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Special Offers Slider */}
              {showSection('show_hero_section') && activeOffers.length > 0 && currentOffer && (
                <div className="relative w-full rounded-[28px] overflow-hidden shadow-md border border-blue-100 h-48 sm:h-56">
                  {currentOffer.image ? (
                    <img
                      src={currentOffer.image}
                      alt={currentOffer.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full saidi-blue-gradient" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#002868]/90 via-black/35 to-transparent" />

                  <div className="absolute bottom-0 right-0 left-0 p-4 sm:p-5 text-right">
                    <h3 className="text-white font-black text-base sm:text-lg leading-snug line-clamp-2 mb-1 drop-shadow">
                      {currentOffer.title}
                    </h3>
                    {currentOffer.description && (
                      <p className="text-white/90 text-xs line-clamp-1 mb-2.5 font-medium">
                        {currentOffer.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="bg-white text-[#0B5ED7] hover:bg-blue-50 text-xs font-black px-4 py-2 rounded-full flex items-center gap-1 shadow-md transition-all active:scale-95"
                        onClick={() => {
                          if (currentOffer.restaurantId) {
                            setLocation(`/restaurant/${currentOffer.restaurantId}`);
                          } else if (currentOffer.menuItemId) {
                            setLocation(`/category/العروض#product-${currentOffer.menuItemId}`);
                          } else {
                            setLocation('/category/العروض');
                          }
                        }}
                      >
                        <span>{language === 'ar' ? getS('btn_shop_now', 'تسوق الآن') : t('shop_now')}</span>
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>

                      {(currentOffer.discountPercent || currentOffer.discountAmount) && (
                        <span className="bg-[#FF6B00] text-white text-xs font-black px-3 py-1 rounded-full shadow-sm">
                          {currentOffer.discountPercent
                            ? `خصم ${currentOffer.discountPercent}%`
                            : `خصم ${currentOffer.discountAmount} ريال`}
                        </span>
                      )}
                    </div>
                  </div>

                  {activeOffers.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={nextOffer}
                        aria-label="التالي"
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-all"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={prevOffer}
                        aria-label="السابق"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-all"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {activeOffers.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            aria-label={`عرض ${i + 1}`}
                            onClick={() => {
                              setOfferIndex(i);
                              startSlider();
                            }}
                            className={`rounded-full transition-all ${
                              i === offerIndex ? 'w-5 h-1.5 bg-[#FF6B00]' : 'w-1.5 h-1.5 bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Dynamic Categories Strip */}
              {showSection('show_categories') && (
                <div className="bg-white rounded-[26px] border border-blue-100/90 shadow-xs p-3.5">
                  <div className="flex overflow-x-auto no-scrollbar gap-3 items-center">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('all');
                        setSelectedTab('all');
                      }}
                      className="flex flex-col items-center gap-1.5 shrink-0 min-w-[68px] group"
                    >
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all ${
                          selectedCategory === 'all'
                            ? 'border-[#0B5ED7] bg-[#EEF5FF] shadow-sm'
                            : 'bg-[#F4F8FF] border-blue-100/70'
                        }`}
                      >
                        <Menu className={`h-5 w-5 ${selectedCategory === 'all' ? 'text-[#0B5ED7]' : 'text-slate-600'}`} />
                      </div>
                      <span
                        className={`text-[11px] font-bold text-center whitespace-nowrap ${
                          selectedCategory === 'all' ? 'text-[#0B5ED7] font-black' : 'text-slate-700'
                        }`}
                      >
                        {language === 'ar' ? getS('text_all_categories', 'كل التصنيفات') : t('all_categories')}
                      </span>
                    </button>

                    {categories
                      ?.filter((c) => c.isActive !== false)
                      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                      .map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            setSelectedTab('all');
                          }}
                          className="flex flex-col items-center gap-1.5 shrink-0 min-w-[68px] group"
                        >
                          <div
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all overflow-hidden ${
                              selectedCategory === cat.id
                                ? 'border-[#0B5ED7] bg-[#EEF5FF] shadow-sm'
                                : 'bg-[#F4F8FF] border-blue-100/70'
                            }`}
                          >
                            {cat.image ? (
                              <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                            ) : cat.icon ? (
                              <i className={`${cat.icon} text-xl ${selectedCategory === cat.id ? 'text-[#0B5ED7]' : 'text-slate-500'}`} />
                            ) : (
                              <UtensilsCrossed className={`h-5 w-5 ${selectedCategory === cat.id ? 'text-[#0B5ED7]' : 'text-slate-500'}`} />
                            )}
                          </div>
                          <span
                            className={`text-[11px] font-bold text-center whitespace-nowrap ${
                              selectedCategory === cat.id ? 'text-[#0B5ED7] font-black' : 'text-slate-700'
                            }`}
                          >
                            {cat.name}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Stores & Restaurants Section */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-black text-[#003B99]">
                    {selectedCategory === 'all'
                      ? 'جميع المطاعم والمحلات'
                      : categories?.find((c) => c.id === selectedCategory)?.name || 'المطاعم والمحلات'}
                  </h2>
                  <span className="text-xs font-bold text-[#0B5ED7] tabular-nums">
                    {filteredRestaurants.length} متجر ومطعم
                  </span>
                </div>

                {/* Filter Segmented Control */}
                <div className="flex bg-white p-1.5 rounded-full gap-1 border border-blue-100 shadow-2xs">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      className={`flex-1 py-2 font-bold text-xs rounded-full transition-all whitespace-nowrap ${
                        selectedTab === tab.key
                          ? 'bg-[#0B5ED7] text-white font-black shadow-xs'
                          : 'text-slate-600 hover:text-[#0B5ED7] hover:bg-blue-50/50'
                      }`}
                      onClick={() => setSelectedTab(tab.key)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {selectedTab === 'nearest' && !userLat && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 text-xs text-amber-800 font-bold">
                    <Navigation className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>يرجى تفعيل الموقع لعرض المتاجر الأقرب إليك</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {filteredRestaurants.map((restaurant) => {
                    const status = getRestaurantStatus(restaurant, appStatus.isOpen);
                    const isFav = favorites.has(restaurant.id);
                    const dist =
                      userLat && userLng && restaurant.latitude && restaurant.longitude
                        ? haversineDistance(
                            userLat,
                            userLng,
                            parseFloat(String(restaurant.latitude)),
                            parseFloat(String(restaurant.longitude))
                          )
                        : null;

                    return (
                      <div
                        key={restaurant.id}
                        className="bg-white rounded-3xl shadow-[0_4px_16px_rgba(11,94,215,0.06)] border border-blue-100/80 overflow-hidden hover:shadow-[0_8px_24px_rgba(11,94,215,0.14)] transition-all cursor-pointer active:scale-[0.99]"
                        onClick={() => setLocation(`/restaurant/${restaurant.id}`)}
                      >
                        <div className="flex items-center p-3.5 gap-3">
                          <div className="shrink-0 flex flex-col items-center gap-1.5">
                            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-blue-100 bg-[#F4F8FF] flex items-center justify-center">
                              {restaurant.image ? (
                                <img src={restaurant.image} alt={restaurant.name} className="w-full h-full object-cover" />
                              ) : (
                                <UtensilsCrossed className="h-6 w-6 text-blue-200" />
                              )}
                            </div>
                            <span className="text-[11px] font-black text-amber-800 flex items-center gap-0.5 tabular-nums">
                              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                              {parseFloat(restaurant.rating || '0') > 0
                                ? (Number(restaurant.rating) || 0).toFixed(1)
                                : '5.0'}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-black text-[#003B99] text-sm leading-tight mb-0.5 truncate">
                              {restaurant.name}
                            </h4>
                            {restaurant.description && (
                              <p className="text-xs text-slate-500 leading-tight mb-1 truncate">
                                {restaurant.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-[11px] text-slate-600 flex-wrap mt-1 tabular-nums">
                              {restaurant.deliveryTime && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-[#0B5ED7]" />
                                  {restaurant.deliveryTime} دقيقة
                                </span>
                              )}
                              {restaurant.deliveryFee !== undefined && (
                                <span className="flex items-center gap-1 font-bold text-[#003B99]">
                                  <Tag className="h-3 w-3 text-[#FF6B00]" />
                                  {restaurant.deliveryFee} ريال
                                </span>
                              )}
                              {dist !== null && (
                                <span className="text-[#0B5ED7] font-bold">· {formatDistance(dist, language)}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end justify-between gap-2 shrink-0">
                            <button
                              type="button"
                              aria-label="المفضلة"
                              className={`p-1.5 rounded-full transition-colors ${
                                isFav ? 'text-[#FF6B00] bg-orange-50' : 'text-slate-300 hover:text-[#FF6B00]'
                              }`}
                              onClick={(e) => toggleFavorite(e, restaurant.id)}
                            >
                              <Heart className={`h-[18px] w-[18px] ${isFav ? 'fill-[#FF6B00]' : ''}`} />
                            </button>
                            <Badge
                              className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border-0 ${
                                status.isOpen ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-white'
                              }`}
                            >
                              {status.isOpen ? t('open') : t('closed')}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {filteredRestaurants.length === 0 && (
                    <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-blue-100">
                      <UtensilsCrossed className="h-10 w-10 text-blue-200 mx-auto mb-3" />
                      <p className="text-slate-600 font-bold text-sm">لا توجد متاجر متاحة في هذا التصنيف حالياً</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory('all');
                          setSelectedTab('all');
                        }}
                        className="mt-3 text-xs font-black text-[#0B5ED7] hover:underline"
                      >
                        عرض جميع المتاجر
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: متابعة الطلبات (Matches Panel 2 of 800a7534 & e7cf083a)          */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {homeMode === 'track' && (
        <div className="max-w-3xl mx-auto px-4 pt-3 space-y-4">
          {/* Royal Blue Curved Hero */}
          <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#1B72FF] via-[#0B5ED7] to-[#003B99] text-white shadow-[0_12px_32px_rgba(11,94,215,0.22)]">
            <svg
              viewBox="0 0 400 44"
              className="absolute bottom-0 left-0 right-0 w-full h-7 pointer-events-none"
              preserveAspectRatio="none"
            >
              <path d="M0,24 Q190,42 400,6 L400,44 L0,44 Z" fill="#FFFFFF" />
              <path d="M0,18 Q190,36 400,0 L400,8 Q190,42 0,25 Z" fill="#FF6B00" />
            </svg>
            <div className="relative z-10 flex items-center justify-between gap-4 px-5 pt-5 pb-8">
              <div>
                <h2 className="text-2xl font-black">متابعة الطلبات</h2>
                <p className="text-xs sm:text-sm text-blue-100 font-bold mt-1">
                  تابع طلبك لحظة بلحظة
                </p>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center shrink-0">
                <MapPin className="h-8 w-8 text-[#FF8A00] fill-[#FF8A00]/25" />
              </div>
            </div>
          </div>

          {/* Quick Order Number Search */}
          <form onSubmit={handleSearchOrder} className="bg-white rounded-3xl border border-blue-100 p-3 flex gap-2 shadow-xs">
            <Input
              value={trackSearch}
              onChange={(e) => {
                setTrackSearch(e.target.value);
                if (!e.target.value.trim()) setSearchedOrder(null);
              }}
              placeholder="ابحث برقم الطلب (مثال: 1258)..."
              className="h-11 rounded-full bg-[#F4F8FF] border-blue-100 px-4 text-sm font-bold"
            />
            <Button
              type="submit"
              disabled={isSearchingOrder}
              className="h-11 px-5 rounded-full bg-[#0B5ED7] hover:bg-[#0950BA] text-white font-black text-xs shrink-0"
            >
              {isSearchingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </form>

          {/* Selector if user has multiple active orders */}
          {!searchedOrder && activeOrdersList.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {activeOrdersList.map((o) => {
                const isSelected = displayedActiveOrder?.id === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setSelectedActiveOrderId(o.id)}
                    className={`px-4 py-2 rounded-full text-xs font-black shrink-0 border transition-all tabular-nums ${
                      isSelected
                        ? 'bg-[#0B5ED7] text-white border-[#0B5ED7]'
                        : 'bg-white text-slate-700 border-blue-100 hover:border-blue-300'
                    }`}
                  >
                    #{o.orderNumber}
                  </button>
                );
              })}
            </div>
          )}

          {displayedActiveOrder ? (
            <div className="bg-white rounded-[28px] border border-blue-100 shadow-[0_8px_28px_rgba(11,94,215,0.08)] overflow-hidden">
              {/* Top Order Header Strip */}
              <div className="p-4 sm:p-5 bg-[#F4F8FF]/80 border-b border-blue-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white border border-blue-100 flex items-center justify-center text-[#0B5ED7]">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500">وقت الطلب</p>
                    <p className="text-xs font-black text-slate-800">{formatOrderTime(displayedActiveOrder.createdAt)}</p>
                  </div>
                </div>
                <div className="text-left">
                  <span className="text-[11px] font-bold text-slate-500 block">رقم الطلب</span>
                  <span className="text-lg font-black text-[#0B5ED7] tabular-nums">
                    #{displayedActiveOrder.orderNumber}
                  </span>
                </div>
              </div>

              <div className="p-4 sm:p-5 space-y-5">
                {/* Status Badge Row */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-600">حالة الطلب</span>
                  <span
                    className={`px-3.5 py-1 rounded-full text-xs font-black border ${
                      getOrderStatusMeta(displayedActiveOrder.status).badgeCls
                    }`}
                  >
                    {getOrderStatusMeta(displayedActiveOrder.status).label}
                  </span>
                </div>

                {/* 4-Step Progress Stepper matching both mockups */}
                {displayedActiveOrder.status !== 'cancelled' && (
                  <div className="grid grid-cols-4 gap-1 relative pt-1">
                    {[
                      { label: 'تم الاستلام', icon: ClipboardList },
                      { label: 'قيد التجهيز', icon: Package },
                      { label: 'جاري التوصيل', icon: Bike },
                      { label: 'تم التسليم', icon: CheckCircle2 },
                    ].map((stepItem, idx) => {
                      const StepIcon = stepItem.icon;
                      const currentIdx = getOrderStatusMeta(displayedActiveOrder.status).step;
                      const isDone = idx < currentIdx;
                      const isCurrent = idx === currentIdx;
                      return (
                        <div key={stepItem.label} className="flex flex-col items-center text-center relative z-10">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                              isCurrent
                                ? 'bg-[#0B5ED7] border-blue-200 text-white shadow-md ring-4 ring-blue-100'
                                : isDone
                                  ? 'bg-emerald-500 border-emerald-200 text-white'
                                  : 'bg-[#F4F8FF] border-blue-100 text-slate-400'
                            }`}
                          >
                            <StepIcon className="h-[18px] w-[18px]" />
                          </div>
                          <span
                            className={`text-[11px] mt-1.5 font-black leading-tight ${
                              isCurrent ? 'text-[#0B5ED7]' : isDone ? 'text-emerald-600' : 'text-slate-400'
                            }`}
                          >
                            {stepItem.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Map Preview Card */}
                <div className="relative h-52 rounded-3xl overflow-hidden border border-blue-100 bg-[#EEF5FF]">
                  <MapComponent
                    center={
                      displayedActiveOrder.customerLocationLat && displayedActiveOrder.customerLocationLng
                        ? [
                            parseFloat(displayedActiveOrder.customerLocationLat),
                            parseFloat(displayedActiveOrder.customerLocationLng),
                          ]
                        : [15.3694, 44.191]
                    }
                    zoom={14}
                    height="100%"
                    markers={
                      displayedActiveOrder.customerLocationLat && displayedActiveOrder.customerLocationLng
                        ? [
                            {
                              position: [
                                parseFloat(displayedActiveOrder.customerLocationLat),
                                parseFloat(displayedActiveOrder.customerLocationLng),
                              ],
                              title: 'موقع التوصيل',
                              type: 'destination',
                            },
                          ]
                        : []
                    }
                  />
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] bg-white/95 backdrop-blur-sm border border-blue-100 rounded-full px-4 py-1.5 shadow-md flex items-center gap-2 whitespace-nowrap">
                    <Bike className="h-4 w-4 text-[#0B5ED7]" />
                    <span className="text-xs font-black text-[#003B99]">
                      {getOrderStatusMeta(displayedActiveOrder.status).label}
                    </span>
                  </div>
                </div>

                {/* Location & ETA details */}
                <div className="bg-[#F4F8FF] rounded-2xl border border-blue-100 p-3.5 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 font-bold">
                    <MapPin className="h-4 w-4 text-[#0B5ED7] shrink-0" />
                    <span className="truncate">الموقع: {displayedActiveOrder.deliveryAddress}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 font-bold">
                    <Clock className="h-4 w-4 text-[#FF6B00] shrink-0" />
                    <span>الوقت المتوقع للوصول: {displayedActiveOrder.estimatedTime || 'خلال 15 - 30 دقيقة'}</span>
                  </div>
                </div>

                {/* Driver Card (real assigned driver or pending state) */}
                {displayedActiveOrder.driverName ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 bg-[#F4F8FF] border border-blue-100 rounded-2xl p-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src="/assets/saidi-driver-avatar.jpg"
                          alt={displayedActiveOrder.driverName}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold text-slate-500 block">المندوب</span>
                          <p className="text-sm font-black text-[#003B99] truncate">
                            {displayedActiveOrder.driverName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {displayedActiveOrder.driverPhone && (
                          <button
                            type="button"
                            onClick={() => safeTriggerPhoneCall(displayedActiveOrder.driverPhone)}
                            className="w-10 h-10 rounded-full bg-[#0B5ED7] text-white flex items-center justify-center shadow-sm hover:bg-[#0950BA]"
                            aria-label="اتصال بالمندوب"
                          >
                            <Phone className="h-[18px] w-[18px]" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setChatOrder(displayedActiveOrder)}
                          className="w-10 h-10 rounded-full bg-white border border-blue-200 text-[#0B5ED7] flex items-center justify-center shadow-2xs hover:bg-blue-50"
                          aria-label="مراسلة المندوب"
                        >
                          <MessageCircle className="h-[18px] w-[18px]" />
                        </button>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setChatOrder(displayedActiveOrder)}
                      className="w-full h-11 rounded-full border-2 border-[#0B5ED7] text-[#0B5ED7] hover:bg-blue-50 font-black text-sm gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>تواصل مع المندوب</span>
                    </Button>
                  </div>
                ) : (
                  <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3.5 text-center text-xs font-bold text-[#003B99]">
                    جاري تعيين أقرب مندوب توصيل لطلبك...
                  </div>
                )}

                <Button
                  type="button"
                  onClick={() => setLocation(`/orders/${displayedActiveOrder.id}`)}
                  className="w-full h-12 rounded-full bg-gradient-to-r from-[#0B5ED7] to-[#0046B8] text-white font-black text-sm shadow-md"
                >
                  عرض تفاصيل التتبع الكاملة
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[28px] border border-blue-100 p-10 text-center space-y-3 shadow-xs">
              <div className="w-16 h-16 rounded-full bg-[#EEF5FF] text-[#0B5ED7] flex items-center justify-center mx-auto">
                <Bike className="h-8 w-8" />
              </div>
              <h3 className="text-base font-black text-[#003B99]">لا توجد طلبات قيد التوصيل حالياً</h3>
              <p className="text-xs text-slate-500 font-semibold">
                يمكنك إرسال طلب جديد الآن أو البحث برقم الطلب أعلاه
              </p>
              <Button
                type="button"
                onClick={() => setHomeMode('new')}
                className="rounded-full bg-[#FF6B00] hover:bg-[#E55E00] text-white font-black px-7 h-11 text-sm"
              >
                اطلب الآن
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: أحدث الطلبات (Matches Panel 3 of 800a7534 & e7cf083a)            */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {homeMode === 'recent' && (
        <div className="max-w-3xl mx-auto px-4 pt-3 space-y-4">
          {/* Royal Blue Curved Hero */}
          <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#1B72FF] via-[#0B5ED7] to-[#003B99] text-white shadow-[0_12px_32px_rgba(11,94,215,0.22)]">
            <svg
              viewBox="0 0 400 44"
              className="absolute bottom-0 left-0 right-0 w-full h-7 pointer-events-none"
              preserveAspectRatio="none"
            >
              <path d="M0,24 Q190,42 400,6 L400,44 L0,44 Z" fill="#FFFFFF" />
              <path d="M0,18 Q190,36 400,0 L400,8 Q190,42 0,25 Z" fill="#FF6B00" />
            </svg>
            <div className="relative z-10 flex items-center justify-between gap-4 px-5 pt-5 pb-8">
              <div>
                <h2 className="text-2xl font-black">أحدث الطلبات</h2>
                <p className="text-xs sm:text-sm text-blue-100 font-bold mt-1">
                  عرض جميع طلباتك السابقة والحالية
                </p>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center shrink-0">
                <ClipboardList className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          {/* Segmented Filter Bar matching Panel 3 of 800a7534 */}
          <div className="flex bg-white p-1.5 rounded-full border border-blue-100 shadow-2xs gap-1">
            {[
              { id: 'all', label: 'عرض الكل' },
              { id: 'active', label: 'قيد التنفيذ' },
              { id: 'delivered', label: 'تم التوصيل' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setRecentFilter(f.id as any)}
                className={`flex-1 py-2.5 rounded-full text-xs font-black transition-all whitespace-nowrap ${
                  recentFilter === f.id
                    ? 'bg-[#0B5ED7] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#0B5ED7]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredRecentOrders.length === 0 ? (
            <div className="bg-white rounded-[28px] border border-blue-100 p-10 text-center space-y-3 shadow-xs">
              <div className="w-16 h-16 rounded-full bg-[#EEF5FF] text-[#0B5ED7] flex items-center justify-center mx-auto">
                <Package className="h-8 w-8" />
              </div>
              <h3 className="text-base font-black text-[#003B99]">لا توجد طلبات في هذا القسم بعد</h3>
              <p className="text-xs text-slate-500 font-semibold">
                {activePhone
                  ? 'ستظهر جميع طلباتك هنا فور إنشائها'
                  : 'سجل دخولك أو أنشئ طلباً جديداً لمتابعة سجل طلباتك'}
              </p>
              <div className="flex justify-center gap-2 pt-1">
                <Button
                  type="button"
                  onClick={() => setHomeMode('new')}
                  className="rounded-full bg-[#FF6B00] hover:bg-[#E55E00] text-white font-black px-6 h-10 text-xs"
                >
                  طلب جديد
                </Button>
                {!user && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation('/auth')}
                    className="rounded-full border-[#0B5ED7] text-[#0B5ED7] font-black px-6 h-10 text-xs gap-1.5"
                  >
                    <User className="h-3.5 w-3.5" />
                    <span>تسجيل الدخول</span>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecentOrders.slice(0, 6).map((order) => {
                const meta = getOrderStatusMeta(order.status);
                return (
                  <div
                    key={order.id}
                    onClick={() => setLocation(`/orders/${order.id}`)}
                    className="bg-white rounded-3xl border border-blue-100/90 shadow-[0_4px_18px_rgba(11,94,215,0.06)] p-4 flex items-center justify-between gap-3 cursor-pointer hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <img
                        src="/assets/saidi-parcel-badge.jpg"
                        alt={order.restaurantName || 'طلب توصيل'}
                        className="w-14 h-14 rounded-2xl object-cover border border-blue-100 shrink-0"
                      />
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${meta.badgeCls}`}>
                            {meta.label}
                          </span>
                          <span className="text-sm font-black text-[#003B99] tabular-nums">
                            #{order.orderNumber}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-600 truncate">
                          {order.restaurantName || 'طلب توصيل'} · {formatOrderTime(order.createdAt)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(`/orders/${order.id}`);
                      }}
                      className="px-3.5 py-2 rounded-full bg-[#EEF5FF] hover:bg-blue-100 text-[#0B5ED7] text-xs font-black flex items-center gap-1 shrink-0 transition-colors whitespace-nowrap"
                    >
                      <span>تفاصيل</span>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation('/orders')}
                className="w-full h-12 rounded-full border-2 border-blue-200 bg-white text-[#0B5ED7] hover:bg-[#EEF5FF] font-black text-sm"
              >
                عرض الكل
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Interactive Map Picker Modal */}
      <Dialog open={isMapDialogOpen} onOpenChange={setIsMapDialogOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-3xl" dir="rtl">
          <DialogHeader className="p-4 border-b border-blue-100 bg-[#F4F8FF]">
            <DialogTitle className="font-black text-[#003B99] text-base">
              اختر موقع التوصيل على الخريطة
            </DialogTitle>
          </DialogHeader>
          <div className="h-[390px] w-full">
            <MapComponent
              center={[
                deliveryCoords?.lat || userLat || 15.3694,
                deliveryCoords?.lng || userLng || 44.191,
              ]}
              zoom={14}
              onLocationSelect={handleMapSelect}
            />
          </div>
          <div className="p-3 bg-white text-xs text-center text-slate-500 font-bold border-t border-blue-50">
            انقر على أي نقطة في الخريطة لتحديد موقع التوصيل وحساب التكلفة تلقائياً
          </div>
        </DialogContent>
      </Dialog>

      {/* Out of Delivery Zone Modal */}
      <OutOfDeliveryZoneModal
        isOpen={showOutOfZoneModal}
        onClose={() => setShowOutOfZoneModal(false)}
        onChangeLocation={() => {
          setShowOutOfZoneModal(false);
          setIsMapDialogOpen(true);
        }}
        reason={outOfZoneReason}
      />

      {/* Driver Live Chat Modal */}
      {chatOrder && (
        <OrderChatModal
          isOpen={Boolean(chatOrder)}
          onClose={() => setChatOrder(null)}
          orderId={chatOrder.id}
          orderNumber={chatOrder.orderNumber}
          recipientName={chatOrder.driverName || 'مندوب التوصيل'}
          recipientPhone={chatOrder.driverPhone || ''}
          currentUserType="customer"
          currentUserId={activeCustomerId || activePhone || 'customer_user'}
        />
      )}
    </div>
  );
}
