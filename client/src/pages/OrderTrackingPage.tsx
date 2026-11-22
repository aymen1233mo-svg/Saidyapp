import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { ArrowRight, MapPin, Clock, Phone, Package, MessageCircle, Map as MapIcon, Loader2 as Loader, XCircle, AlertTriangle, ListFilter, Navigation, CheckCircle2, Bike, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Skeleton } from '@/components/ui/skeleton';
import RatingDialog from '@/components/RatingDialog';
import { DriverCommunication } from '@/components/DriverCommunication';
import MapComponent from '@/components/maps/MapComponent';
import LiveRideTrackingView from '@/components/tracking/LiveRideTrackingView';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/LanguageContext';
import { safeTriggerPhoneCall, safeOpenWhatsApp } from '@/lib/callUtils';

interface OrderStatus {
  id: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'on_way' | 'delivered' | 'cancelled';
  timestamp: Date;
  description: string;
  message?: string;
}

interface OrderDetails {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  customerLocationLat?: string;
  customerLocationLng?: string;
  items: any[];
  total: number;
  totalAmount?: number;
  status: string;
  estimatedTime: string;
  driverName?: string;
  driverPhone?: string;
  driverId?: string;
  restaurantName?: string;
  orderNumber: string;
  createdAt: Date;
  scheduledDate?: string;
  scheduledTimeSlot?: string;
  isSareeOneLi?: boolean;
  pickupAddress?: string;
  pickupPhone?: string;
  pickupName?: string;
  waselLiItemType?: string;
}

const CANCELLABLE_STATUSES = ['pending', 'scheduled', 'confirmed'];

export default function OrderTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [, setLocation] = useLocation();
  const { t, language } = useLanguage();
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [hasShownRating, setHasShownRating] = useState(false);
  const [driverLocation, setDriverLocation] = useState<[number, number] | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'details'>('map');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const { toast } = useToast();
  
  const { data: uiSettings } = useQuery<any[]>({
    queryKey: ['/api/ui-settings'],
  });

  const supportPhone = uiSettings?.find(s => s.key === 'support_phone')?.value || '967777146387';
  const supportWhatsapp = uiSettings?.find(s => s.key === 'support_whatsapp')?.value || '967777146387';

  const { data: orderData, isLoading, error, refetch } = useQuery<{order: OrderDetails, tracking: OrderStatus[]}>({
    queryKey: [`/api/orders/${orderId}/track`],
    enabled: !!orderId,
    refetchInterval: (query) => {
      const status = query.state.data?.order?.status;
      if (status === 'delivered' || status === 'cancelled') return false;
      return 15000;
    },
  });

  useEffect(() => {
    if (!orderId) return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        ws?.send(JSON.stringify({
          type: 'track_order',
          payload: { orderId }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const isRelevantOrder = message.payload?.orderId === orderId || message.payload?.id === orderId;
          
          if ((message.type === 'order_status_changed' || message.type === 'order_update') && isRelevantOrder) {
            refetch();
          } else if (message.type === 'driver_location' && message.payload.driverId === orderData?.order.driverId) {
            setDriverLocation([message.payload.latitude, message.payload.longitude]);
          } else if (message.type === 'settings_changed') {
            queryClient.invalidateQueries({ queryKey: ['/api/ui-settings'] });
          }
        } catch (err) {
          console.error('Failed to parse WS message:', err);
        }
      };

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
    };
  }, [orderId, refetch, orderData?.order.driverId]);

  useEffect(() => {
    if (orderData?.order.status === 'delivered' && !hasShownRating) {
      setShowRatingDialog(true);
      setHasShownRating(true);
    }
  }, [orderData?.order.status, hasShownRating]);

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      toast({ 
        title: language === 'ar' ? "يرجى إدخال سبب الإلغاء" : "Please enter cancellation reason", 
        variant: "destructive" 
      });
      return;
    }
    setIsCancelling(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason, cancelledBy: 'customer' }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setShowCancelDialog(false);
        toast({ 
          title: language === 'ar' ? "تم إلغاء الطلب" : "Order Cancelled", 
          description: `${language === 'ar' ? 'سبب الإلغاء:' : 'Reason:'} ${cancelReason}` 
        });
        refetch();
      } else {
        throw new Error(data.error || (language === 'ar' ? 'فشل في إلغاء الطلب' : 'Failed to cancel order'));
      }
    } catch (error: any) {
      toast({ 
        title: language === 'ar' ? "خطأ في الإلغاء" : "Cancellation Error", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F8FF] p-4">
        <div className="max-w-md mx-auto space-y-4">
          <Skeleton className="h-8 w-3/4 rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-48 w-full rounded-3xl" />
          <Skeleton className="h-24 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="min-h-screen bg-[#F4F8FF] p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <Card className="text-center p-8 rounded-3xl border border-blue-100 bg-white shadow-sm">
            <Package className="h-12 w-12 mx-auto text-[#0B5ED7] mb-4" />
            <h2 className="text-xl font-black text-slate-900 mb-2">
              {language === 'ar' ? 'الطلب غير موجود' : 'Order Not Found'}
            </h2>
            <p className="text-slate-500 mb-5 font-medium text-sm">
              {language === 'ar' ? 'لم نتمكن من العثور على هذا الطلب' : 'We could not find this order'}
            </p>
            <Button onClick={() => setLocation('/')} data-testid="button-back-home" className="bg-[#0B5ED7] hover:bg-[#0950BA] text-white rounded-full px-8">
              {language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const { order, tracking } = orderData;

  const getStatusProgress = (status: string) => {
    const statusMap: Record<string, number> = {
      scheduled: 10,
      pending: 25,
      assigned: 35,
      confirmed: 40,
      preparing: 60,
      ready: 70,
      picked_up: 75,
      on_way: 80,
      delivered: 100,
      cancelled: 0,
    };
    return statusMap[status] ?? 0;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      scheduled: 'bg-indigo-500',
      pending: 'bg-amber-500',
      assigned: 'bg-sky-500',
      confirmed: 'bg-[#0B5ED7]',
      preparing: 'bg-[#FF6B00]',
      ready: 'bg-teal-500',
      picked_up: 'bg-[#0B5ED7]',
      on_way: 'bg-[#0B5ED7]',
      delivered: 'bg-emerald-500',
      cancelled: 'bg-rose-500',
    };
    return colorMap[status] || 'bg-slate-500';
  };

  const getStatusText = (status: string) => {
    const textMapAr: Record<string, string> = {
      scheduled: 'مجدول',
      pending: 'تم استلام الطلب',
      assigned: 'تم تعيين سائق',
      confirmed: 'مؤكد',
      preparing: 'قيد التجهيز',
      ready: 'جاهز للاستلام',
      picked_up: 'تم الاستلام',
      on_way: 'قيد التوصيل',
      delivered: 'تم التسليم',
      cancelled: 'ملغي',
    };
    const textMapEn: Record<string, string> = {
      scheduled: 'Scheduled',
      pending: 'Pending',
      assigned: 'Driver Assigned',
      confirmed: 'Confirmed',
      preparing: 'Preparing',
      ready: 'Ready for Pickup',
      picked_up: 'Picked Up',
      on_way: 'On the way',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };
    return (language === 'ar' ? textMapAr[status] : textMapEn[status]) || status;
  };

  const activeStepIndex = (() => {
    if (order.status === 'delivered') return 3;
    if (['on_way', 'picked_up'].includes(order.status)) return 2;
    if (['preparing', 'ready', 'confirmed', 'assigned'].includes(order.status)) return 1;
    return 0;
  })();

  const stepperSteps = [
    { label: language === 'ar' ? 'تم استلام الطلب' : 'Received', icon: ClipboardList },
    { label: language === 'ar' ? 'قيد التجهيز' : 'Preparing', icon: Package },
    { label: language === 'ar' ? 'قيد التوصيل' : 'On the way', icon: Bike },
    { label: language === 'ar' ? 'تم التسليم' : 'Delivered', icon: CheckCircle2 },
  ];

  if (viewMode === 'map') {
    return (
      <>
        <LiveRideTrackingView
          order={order}
          driverLocation={driverLocation}
          onBack={() => setLocation('/orders')}
          onCancelOrder={() => setShowCancelDialog(true)}
          canCancel={CANCELLABLE_STATUSES.includes(order.status)}
        />

        {/* View Mode Toggle to Details */}
        <div className="fixed top-6 left-16 z-30 pointer-events-auto">
          <button
            onClick={() => setViewMode('details')}
            className="px-3.5 py-2 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-blue-100 text-xs font-black text-[#0B5ED7] hover:bg-[#EEF5FF] flex items-center gap-1.5 active:scale-95 transition-all"
            title={language === 'ar' ? 'عرض تفاصيل الفاتورة' : 'View order details'}
          >
            <ListFilter className="w-3.5 h-3.5 text-[#0B5ED7]" />
            <span>{language === 'ar' ? 'تفاصيل الطلب' : 'Details'}</span>
          </button>
        </div>

        {showRatingDialog && orderData && (
          <RatingDialog
            isOpen={showRatingDialog}
            onClose={() => setShowRatingDialog(false)}
            orderId={order.id}
            restaurantName={order.restaurantName || (language === 'ar' ? 'المتجر' : 'Store')}
            driverName={order.driverName}
          />
        )}

        {showCancelDialog && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-blue-100 animate-in zoom-in-95 duration-150">
              <div className="bg-rose-600 p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-white" />
                  <h3 className="font-black text-base">{language === 'ar' ? 'إلغاء الطلب' : 'Cancel Order'}</h3>
                </div>
                <button onClick={() => setShowCancelDialog(false)} className="text-white/80 hover:text-white">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-xs font-bold text-slate-600">
                  {language === 'ar' ? 'يرجى تحديد سبب إلغاء الطلب:' : 'Please select cancellation reason:'}
                </p>
                <div className="space-y-1.5">
                  {(language === 'ar' ? [
                    'غيّرت رأيي',
                    'طلبت بالخطأ',
                    'تأخر الطلب',
                    'سبب آخر',
                  ] : [
                    'Changed my mind',
                    'Ordered by mistake',
                    'Delivery delayed',
                    'Other reason',
                  ]).map(reason => (
                    <button
                      key={reason}
                      onClick={() => setCancelReason(reason)}
                      className={`w-full text-start px-3.5 py-2.5 rounded-2xl text-xs font-bold border transition-all ${
                        cancelReason === reason
                          ? 'border-rose-500 bg-rose-50 text-rose-700'
                          : 'border-blue-100 bg-[#F4F8FF] hover:border-blue-200 text-slate-700'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-full text-xs font-bold border-blue-200 text-[#0B5ED7]"
                    onClick={() => setShowCancelDialog(false)}
                    disabled={isCancelling}
                  >
                    {t('cancel')}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 rounded-full text-xs font-black"
                    onClick={handleCancelOrder}
                    disabled={isCancelling || !cancelReason.trim()}
                  >
                    {isCancelling ? <Loader className="w-3.5 h-3.5 animate-spin" /> : (language === 'ar' ? 'تأكيد الإلغاء' : 'Confirm')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F8FF] pb-24">
      {/* Header matching Al-Saidi Tracking Mockup */}
      <header className="relative bg-gradient-to-br from-[#0B5ED7] via-[#0950BA] to-[#003B99] text-white shadow-lg rounded-b-[2.25rem] sticky top-0 z-10 px-4 pt-4 pb-6 overflow-hidden">
        <div className="absolute -bottom-1 left-0 right-0 h-2.5 bg-gradient-to-r from-[#FF6B00] via-[#FF8533] to-[#FF6B00]" />
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-white bg-white/15 hover:bg-white/25 rounded-full backdrop-blur-sm"
              onClick={() => setLocation('/orders')}
              data-testid="button-tracking-back"
            >
              <ArrowRight className={`h-5 w-5 ${language === 'en' ? 'rotate-180' : ''}`} />
            </Button>
            <div>
              <h2 className="text-lg font-black text-white">{language === 'ar' ? 'متابعة الطلبات' : t('track_order')}</h2>
              <p className="text-xs text-blue-100 font-semibold">{language === 'ar' ? 'تابع طلبك لحظة بلحظة • #' : 'Track your order live • #'}{order.orderNumber || order.id}</p>
            </div>
          </div>

          <Button
            onClick={() => setViewMode('map')}
            className="bg-[#FF6B00] hover:bg-[#E55E00] text-white rounded-full font-black text-xs px-4 py-2 flex items-center gap-1.5 shadow-md"
          >
            <Navigation className="w-3.5 h-3.5 text-white" />
            <span>{language === 'ar' ? 'الخريطة الحية' : 'Live Map'}</span>
          </Button>
        </div>
      </header>

      <section className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Order Status Card with 4-step Stepper */}
        <Card className="rounded-3xl border border-blue-100/80 shadow-[0_6px_24px_rgba(11,94,215,0.06)] overflow-hidden bg-white">
          <CardHeader className="bg-[#F4F8FF]/70 border-b border-blue-100/60 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="bg-[#0B5ED7] text-white font-black text-xs px-3 py-1 rounded-full">
                  #{order.orderNumber || order.id}
                </span>
              </div>
              <Badge 
                className={`${getStatusColor(order.status)} text-white font-black text-xs px-3 py-1 rounded-full shadow-xs`}
                data-testid="order-status-badge"
              >
                {getStatusText(order.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            {/* 4-Step Horizontal Stepper matching mockup a3af717f / 800a7534 */}
            {order.status !== 'cancelled' && (
              <div className="grid grid-cols-4 gap-1 relative pt-1">
                {stepperSteps.map((st, idx) => {
                  const Icon = st.icon;
                  const isDone = idx < activeStepIndex;
                  const isCurrent = idx === activeStepIndex;
                  return (
                    <div key={idx} className="flex flex-col items-center text-center relative z-10">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border-2 ${
                          isCurrent
                            ? 'bg-[#0B5ED7] border-blue-200 text-white shadow-md shadow-blue-500/30 ring-4 ring-blue-100'
                            : isDone
                              ? 'bg-emerald-500 border-emerald-200 text-white'
                              : 'bg-[#F4F8FF] border-blue-100 text-slate-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`text-[10px] mt-1.5 font-black leading-tight ${
                        isCurrent ? 'text-[#0B5ED7]' : isDone ? 'text-emerald-600' : 'text-slate-400'
                      }`}>
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-3 py-1.5 rounded-full w-fit">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span>{language === 'ar' ? 'التحديث المباشر مفعل لحظة بلحظة' : 'Live Real-Time Updates Active'}</span>
            </div>
            
            <div className="flex items-center gap-3 bg-[#F4F8FF] p-3.5 rounded-2xl border border-blue-100/70">
              <div className="w-10 h-10 rounded-xl bg-white border border-blue-100 flex items-center justify-center text-[#0B5ED7]">
                <Clock className="h-5 w-5 text-[#0B5ED7]" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-bold">{language === 'ar' ? 'الوقت المتوقع للوصول: ' : 'Estimated Arrival: '}</span>
                <span className="font-black text-sm text-[#0B5ED7] block" data-testid="estimated-time">
                  {order.estimatedTime}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-black">
                <span className="text-slate-500">{language === 'ar' ? 'مرحلة التقدم' : 'Progress'}</span>
                <span className="text-[#0B5ED7]">{getStatusProgress(order.status)}%</span>
              </div>
              <Progress 
                value={getStatusProgress(order.status)} 
                className="h-2.5 rounded-full bg-[#EEF5FF] [&>div]:bg-gradient-to-r [&>div]:from-[#0B5ED7] [&>div]:to-[#FF6B00]"
                data-testid="order-progress"
              />
            </div>

            {order.status === 'scheduled' && (order.scheduledDate || order.scheduledTimeSlot) && (
              <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3">
                <Clock className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-black text-indigo-900">{language === 'ar' ? 'طلب مجدول' : 'Scheduled Order'}</p>
                  {order.scheduledDate && (
                    <p className="text-xs font-bold text-indigo-700 mt-0.5">
                      {language === 'ar' ? 'التاريخ:' : 'Date:'} {new Date(order.scheduledDate).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                      })}
                    </p>
                  )}
                  {order.scheduledTimeSlot && (
                    <p className="text-xs font-bold text-indigo-700 mt-0.5">{language === 'ar' ? 'الوقت:' : 'Time:'} {order.scheduledTimeSlot}</p>
                  )}
                  <p className="text-xs text-indigo-600 mt-1">
                    {language === 'ar' ? 'سيتم تفعيل طلبك تلقائياً قبل 30 دقيقة من الوقت المحدد' : 'Your order will be activated 30 minutes prior to scheduled time'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Wasalni Pickup Info */}
        {order.isSareeOneLi && (
          <Card className="rounded-3xl border border-blue-200/80 bg-[#EEF5FF]/60 shadow-xs overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white border border-blue-200 flex items-center justify-center text-[#0B5ED7] shrink-0">
                  <Package className="h-5 w-5 text-[#0B5ED7]" />
                </div>
                <div>
                  <h4 className="font-black text-[#0B5ED7] text-sm mb-1">{language === 'ar' ? 'بيانات الاستلام (طلب خاص)' : 'Pickup Details'}</h4>
                  <p className="text-xs font-black text-slate-800 mb-1">
                    {order.pickupAddress}
                  </p>
                  {order.pickupName && (
                    <p className="text-xs font-bold text-slate-500">{language === 'ar' ? 'الاسم:' : 'Name:'} {order.pickupName}</p>
                  )}
                  {order.pickupPhone && (
                    <p className="text-xs font-bold text-slate-500">{language === 'ar' ? 'الهاتف:' : 'Phone:'} {order.pickupPhone}</p>
                  )}
                  {order.waselLiItemType && (
                    <Badge variant="outline" className="mt-2 bg-white text-[10px] font-black border-blue-200 text-[#0B5ED7]">
                      {language === 'ar' ? 'نوع الغرض:' : 'Item Type:'} {order.waselLiItemType}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Driver Info & Map */}
        {(['confirmed', 'preparing', 'ready', 'picked_up', 'on_way'].includes(order.status)) && order.driverId && (
          <div className="space-y-4">
            <Card className="rounded-3xl border border-blue-100/80 shadow-[0_6px_24px_rgba(11,94,215,0.06)] overflow-hidden bg-white">
              <CardHeader className="pb-2 bg-[#F4F8FF]/70 border-b border-blue-100/60">
                <CardTitle className="text-sm font-black flex items-center gap-2 text-slate-900">
                  <MapIcon className="h-4 w-4 text-[#0B5ED7]" />
                  {language === 'ar' ? 'تتبع الموقع المباشر' : 'Live Driver Tracking'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-[240px] relative">
                <MapComponent 
                  center={driverLocation || [15.3694, 44.1910]}
                  zoom={15}
                  height="100%"
                  driverPosition={driverLocation || undefined}
                  markers={order.customerLocationLat && order.customerLocationLng ? [{
                    position: [parseFloat(order.customerLocationLat), parseFloat(order.customerLocationLng)],
                    title: language === 'ar' ? 'موقعك' : 'Your Location',
                    type: 'destination'
                  }] : []}
                />
                {!driverLocation && (
                  <div className="absolute inset-0 bg-black/10 flex items-center justify-center backdrop-blur-[1px] z-[400]">
                    <div className="bg-white px-4 py-2 rounded-full shadow-lg border border-blue-100 flex items-center gap-2">
                      <Loader className="h-4 w-4 animate-spin text-[#0B5ED7]" />
                      <span className="text-xs font-black text-slate-800">
                        {language === 'ar' ? 'في انتظار إشارة موقع السائق...' : 'Waiting for driver GPS location...'}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <DriverCommunication 
              driver={{
                id: order.driverId || '',
                name: order.driverName || (language === 'ar' ? 'سائق التوصيل' : 'Delivery Driver'),
                phone: order.driverPhone || '',
                isAvailable: true
              }}
              orderId={order.id}
              orderNumber={order.orderNumber}
              customerLocation={order.deliveryAddress}
            />
          </div>
        )}

        {/* Delivery Address */}
        <Card className="rounded-3xl border border-blue-100/80 shadow-[0_6px_24px_rgba(11,94,215,0.06)] overflow-hidden bg-white">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#EEF5FF] border border-blue-100 flex items-center justify-center text-[#0B5ED7] shrink-0">
                <MapPin className="h-5 w-5 text-[#0B5ED7]" />
              </div>
              <div>
                <h4 className="font-black text-xs text-slate-400 mb-0.5">{t('delivery_address')}</h4>
                <p className="text-sm font-black text-slate-800" data-testid="delivery-address">
                  {order.deliveryAddress}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card className="rounded-3xl border border-blue-100/80 shadow-[0_6px_24px_rgba(11,94,215,0.06)] overflow-hidden bg-white">
          <CardHeader className="pb-3 bg-[#F4F8FF]/70 border-b border-blue-100/60">
            <CardTitle className="text-sm font-black text-slate-900">{t('order_summary')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-3">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-1.5 border-b border-blue-50 last:border-0">
                <div className="flex-1">
                  <span className="text-slate-800 font-bold text-xs" data-testid={`item-name-${index}`}>
                    {item.name}
                  </span>
                  <span className="text-slate-400 font-bold text-xs mx-2">
                    × {item.quantity}
                  </span>
                </div>
                <span className="font-black text-xs text-slate-900" data-testid={`item-price-${index}`}>
                  {item.price * item.quantity} {t('currency_riyal')}
                </span>
              </div>
            ))}
            <div className="bg-[#EEF5FF] rounded-2xl px-4 py-3 mt-2">
              <div className="flex justify-between items-center font-black">
                <span className="text-slate-800 text-sm">{t('total')}</span>
                <span className="text-[#FF6B00] text-base" data-testid="order-total">
                  {order.total} {t('currency_riyal')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Timeline */}
        <Card className="rounded-3xl border border-blue-100/80 shadow-[0_6px_24px_rgba(11,94,215,0.06)] overflow-hidden bg-white">
          <CardHeader className="pb-3 bg-[#F4F8FF]/70 border-b border-blue-100/60">
            <CardTitle className="text-sm font-black text-slate-900">{language === 'ar' ? 'تاريخ ومراحل الطلب' : 'Order Timeline'}</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="space-y-4">
              {tracking.map((status, index) => (
                <div key={status.id} className="flex items-start gap-3">
                  <div className={`w-3.5 h-3.5 rounded-full ${getStatusColor(status.status)} mt-1 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 font-bold text-xs" data-testid={`timeline-description-${index}`}>
                      {status.description || status.message || (language === 'ar' ? 'تحديث الطلب' : 'Order update')}
                    </p>
                    <p className="text-[11px] text-slate-400 font-bold" data-testid={`timeline-time-${index}`}>
                      {new Date(status.timestamp).toLocaleTimeString(language === 'ar' ? 'ar-YE' : 'en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-full font-black text-xs py-3 h-11"
              onClick={() => safeOpenWhatsApp(supportWhatsapp, `${language === 'ar' ? 'السلام عليكم، أحتاج مساعدة بخصوص طلبي #' : 'Hello, I need help with order #'}${order.orderNumber || order.id}`)}
              data-testid="button-whatsapp-support"
            >
              <MessageCircle className="h-4 w-4" />
              {language === 'ar' ? 'واتساب الإدارة' : 'Support WhatsApp'}
            </Button>
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2 border-[#0B5ED7] text-[#0B5ED7] hover:bg-[#EEF5FF] rounded-full font-black text-xs py-3 h-11"
              onClick={() => safeTriggerPhoneCall(supportPhone)}
              data-testid="button-call-support"
            >
              <Phone className="h-4 w-4" />
              {language === 'ar' ? 'اتصال بالإدارة' : 'Call Support'}
            </Button>
          </div>
          
          {CANCELLABLE_STATUSES.includes(order.status) && (
            <Button 
              variant="destructive" 
              className="w-full flex items-center justify-center gap-2 rounded-full font-black text-xs py-3 h-12 shadow-md"
              data-testid="button-cancel-order"
              onClick={() => { setCancelReason(''); setShowCancelDialog(true); }}
            >
              <XCircle className="h-4 w-4" />
              {language === 'ar' ? 'إلغاء الطلب' : 'Cancel Order'}
            </Button>
          )}

          {!CANCELLABLE_STATUSES.includes(order.status) && order.status !== 'delivered' && order.status !== 'cancelled' && (
            <div className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{language === 'ar' ? 'لا يمكن إلغاء الطلب بعد بدء التوصيل، يرجى التواصل مع الإدارة' : 'Order cannot be cancelled after delivery starts. Please contact support.'}</span>
            </div>
          )}
        </div>
      </section>

      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-blue-100">
            <div className="bg-rose-600 px-5 py-4 text-white">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                <h3 className="font-black text-lg">{language === 'ar' ? 'إلغاء الطلب' : 'Cancel Order'}</h3>
              </div>
              <p className="text-white/80 text-sm mt-1">{language === 'ar' ? 'طلب رقم #' : 'Order #'}{order.orderNumber}</p>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-sm font-bold text-slate-700 mb-2">{language === 'ar' ? 'لماذا تريد إلغاء الطلب؟' : 'Why do you want to cancel?'}</p>
                <div className="space-y-2">
                  {(language === 'ar' ? [
                    'غيّرت رأيي',
                    'طلبت بالخطأ',
                    'وجدت بديلاً أفضل',
                    'تأخر الطلب كثيراً',
                    'ظروف طارئة',
                  ] : [
                    'Changed my mind',
                    'Ordered by mistake',
                    'Found a better alternative',
                    'Delivery is delayed',
                    'Emergency reasons',
                  ]).map(reason => (
                    <button
                      key={reason}
                      onClick={() => setCancelReason(reason)}
                      className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} px-3.5 py-2.5 rounded-2xl text-sm border-2 transition-all ${
                        cancelReason === reason
                          ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold'
                          : 'border-blue-50 bg-[#F4F8FF] hover:border-blue-200 text-slate-700'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder={language === 'ar' ? "سبب آخر (اختياري)..." : "Other reason (optional)..."}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full mt-2 p-3 border-2 border-blue-100 rounded-2xl text-sm resize-none focus:border-rose-400 outline-none"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  className="flex-1 rounded-full font-bold border-blue-200 text-[#0B5ED7]"
                  onClick={() => setShowCancelDialog(false)}
                  disabled={isCancelling}
                >
                  {t('cancel')}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 rounded-full font-black"
                  onClick={handleCancelOrder}
                  disabled={isCancelling || !cancelReason.trim()}
                >
                  {isCancelling ? (
                    <Loader className="animate-spin h-4 w-4" />
                  ) : (
                    language === 'ar' ? 'تأكيد الإلغاء' : 'Confirm Cancel'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRatingDialog && orderData && (
        <RatingDialog
          isOpen={showRatingDialog}
          onClose={() => setShowRatingDialog(false)}
          orderId={order.id}
          restaurantName={order.restaurantName || (language === 'ar' ? 'المتجر' : 'Store')}
          driverName={order.driverName}
        />
      )}
    </div>
  );
}
