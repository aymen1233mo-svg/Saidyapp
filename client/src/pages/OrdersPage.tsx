import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { ArrowRight, Package, Clock, CheckCircle, XCircle, Eye, Loader, Star, Phone, X, Bike } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import RatingDialog from '@/components/RatingDialog';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: string;
  notes?: string;
  paymentMethod: string;
  items: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  totalAmount: string;
  restaurantId: string;
  restaurantName?: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  isRated?: boolean;
  status: 'pending' | 'confirmed' | 'preparing' | 'on_way' | 'delivered' | 'cancelled' | 'scheduled';
  createdAt: string;
  updatedAt: string;
  estimatedTime?: string;
  driverEarnings: string;
  customerId?: string;
  parsedItems?: OrderItem[];
  _isWasalni?: boolean;
}

interface OrderItem {
  id?: string;
  name: string;
  quantity: number;
  price: number;
  restaurantId?: string;
  restaurantName?: string;
}

export default function OrdersPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [customCancelReason, setCustomCancelReason] = useState('');

  const CANCEL_REASONS = language === 'ar' ? [
    'غيّرت رأيي',
    'طلبت بالخطأ',
    'تأخر وقت التوصيل',
    'لا يوجد سائق متاح',
    'مشكلة في الدفع',
    'سبب آخر',
  ] : [
    'Changed my mind',
    'Ordered by mistake',
    'Delivery taking too long',
    'No driver available',
    'Payment issue',
    'Other reason',
  ];

  const otherReasonKey = language === 'ar' ? 'سبب آخر' : 'Other reason';

  const customerPhone = user?.phone || localStorage.getItem('customer_phone');
  const customerId = user?.id || '';

  const { data: orders = [], isLoading, error } = useQuery<Order[]>({
    queryKey: ['orders', customerPhone, customerId],
    enabled: !!(customerPhone || customerId),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (customerId) params.set('customerId', customerId);
      const queryStr = params.toString() ? `?${params.toString()}` : '';

      const phoneSegment = customerPhone
        ? encodeURIComponent(customerPhone)
        : (customerId ? `id:${encodeURIComponent(customerId)}` : '');

      const [ordersRes, wasalniRes] = await Promise.all([
        fetch(`/api/orders/customer/${phoneSegment}${queryStr}`),
        fetch(`/api/wasalni?phone=${encodeURIComponent(customerPhone || '')}`),
      ]);
      if (!ordersRes.ok) {
        throw new Error(language === 'ar' ? 'فشل في جلب الطلبات' : 'Failed to fetch orders');
      }
      const data: Order[] = await ordersRes.json();

      const foodOrders: Order[] = data.map((order: Order) => {
        let parsedItems: OrderItem[] = [];
        try {
          parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items as any);
        } catch (e) {
          console.error('Error parsing order items:', e);
        }

        let restaurantName = order.restaurantName;
        if (!restaurantName && parsedItems.length > 0 && parsedItems[0].restaurantName) {
          restaurantName = parsedItems[0].restaurantName;
        } else if (!restaurantName) {
          restaurantName = language === 'ar' ? 'المتجر الرئيسي' : 'Main Store';
        }

        return { ...order, restaurantName, parsedItems };
      });

      let wasalniOrders: Order[] = [];
      if (wasalniRes.ok) {
        try {
          const wasalniData: any[] = await wasalniRes.json();
          wasalniOrders = (wasalniData || [])
            .map((w) => ({
              id: w.id,
              orderNumber: w.requestNumber,
              customerName: w.customerName,
              customerPhone: w.customerPhone,
              deliveryAddress: w.toAddress,
              notes: w.notes || '',
              paymentMethod: 'cash',
              items: '[]',
              subtotal: w.estimatedFee || '0',
              deliveryFee: w.estimatedFee || '0',
              total: w.estimatedFee || '0',
              totalAmount: w.estimatedFee || '0',
              restaurantId: '',
              restaurantName: `${language === 'ar' ? 'وصل لي' : 'Wasalni'} - ${w.orderType || (language === 'ar' ? 'توصيل' : 'Delivery')}`,
              status: w.status,
              createdAt: w.createdAt,
              updatedAt: w.updatedAt,
              driverEarnings: '0',
              _isWasalni: true,
              parsedItems: [
                { name: `${language === 'ar' ? 'من' : 'From'}: ${w.fromAddress}`, quantity: 1, price: 0 },
                { name: `${language === 'ar' ? 'إلى' : 'To'}: ${w.toAddress}`, quantity: 1, price: 0 },
              ],
            } as Order));
        } catch (e) {
          console.error('Error loading Wasalni orders:', e);
        }
      }

      const merged = [...foodOrders, ...wasalniOrders];
      merged.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return merged;
    },
    refetchInterval: 30000,
    retry: 1
  });

  useEffect(() => {
    if (!customerPhone) return;
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

        ws.onopen = () => {
          const cid = user?.id;
          if (cid) {
            ws?.send(JSON.stringify({
              type: 'auth',
              payload: { userId: cid, userType: 'customer' },
            }));
          }
          if (customerPhone && customerPhone !== cid) {
            ws?.send(JSON.stringify({
              type: 'auth',
              payload: { userId: customerPhone, userType: 'customer' },
            }));
          }
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (
              message.type === 'order_update' ||
              message.type === 'order_status_changed' ||
              message.type === 'new_wasalni_request' ||
              message.type === 'driver_assigned'
            ) {
              queryClient.invalidateQueries({ queryKey: ['orders', customerPhone, customerId] });
            }
          } catch (err) {
            console.error('Failed to parse WS message in OrdersPage:', err);
          }
        };

        ws.onclose = () => {
          if (!cancelled) {
            reconnectTimeout = setTimeout(connect, 5000);
          }
        };
        ws.onerror = () => {
          try { ws?.close(); } catch {}
        };
      } catch (err) {
        console.error('WebSocket connection failed:', err);
      }
    };

    connect();
    return () => {
      cancelled = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      try { ws?.close(); } catch {}
    };
  }, [customerPhone, customerId, user?.id, queryClient]);

  const cancelOrderMutation = useMutation({
    mutationFn: async ({ orderId, reason, isWasalni }: { orderId: string; reason: string; isWasalni?: boolean }) => {
      const url = isWasalni ? `/api/wasalni/${orderId}` : `/api/orders/${orderId}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', cancelReason: reason, updatedBy: customerPhone, updatedByType: 'customer' }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || (language === 'ar' ? 'فشل في إلغاء الطلب' : 'Failed to cancel order'));
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', customerPhone] });
      toast({
        title: language === 'ar' ? "تم إلغاء الطلب" : "Order Cancelled",
        description: language === 'ar' ? "تم إلغاء طلبك بنجاح" : "Your order has been cancelled successfully",
      });
      setShowCancelDialog(false);
      setCancellingOrder(null);
      setCancelReason('');
      setCustomCancelReason('');
    },
    onError: (err: any) => {
      toast({
        title: language === 'ar' ? "خطأ في الإلغاء" : "Cancellation Error",
        description: err.message || (language === 'ar' ? "حدث خطأ، يرجى المحاولة مرة أخرى" : "Error occurred, please try again"),
        variant: "destructive",
      });
    }
  });

  const getStatusLabel = (status: string) => {
    const statusMapAr: Record<string, string> = {
      pending: 'قيد المراجعة',
      confirmed: 'مؤكد',
      preparing: 'قيد التجهيز',
      on_way: 'قيد التوصيل',
      delivered: 'تم التسليم',
      cancelled: 'ملغي',
      scheduled: 'مجدول',
    };
    const statusMapEn: Record<string, string> = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      preparing: 'Preparing',
      on_way: 'On the way',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      scheduled: 'Scheduled',
    };
    return (language === 'ar' ? statusMapAr[status] : statusMapEn[status]) || status;
  };

  const getStatusBadgeClasses = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-800 border-amber-200',
      confirmed: 'bg-sky-100 text-[#0B5ED7] border-sky-200',
      preparing: 'bg-orange-100 text-[#FF6B00] border-orange-200',
      on_way: 'bg-[#EEF5FF] text-[#0B5ED7] border-blue-200',
      delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
      scheduled: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    };
    return colorMap[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getStatusIcon = (status: string) => {
    const iconMap: Record<string, any> = {
      pending: Clock,
      confirmed: Package,
      preparing: Package,
      on_way: Bike,
      delivered: CheckCircle,
      cancelled: XCircle,
      scheduled: Clock,
    };
    return iconMap[status] || Clock;
  };

  const canCancelOrder = (status: string) => {
    return ['pending', 'confirmed', 'preparing', 'scheduled'].includes(status);
  };

  const displayOrders = orders;

  const filteredOrders = displayOrders.filter(order => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'active') return ['pending', 'confirmed', 'preparing', 'on_way', 'scheduled'].includes(order.status);
    if (selectedTab === 'completed') return order.status === 'delivered';
    if (selectedTab === 'cancelled') return order.status === 'cancelled';
    return true;
  });

  const handleViewOrder = (orderId: string) => {
    setLocation(`/orders/${orderId}`);
  };

  const handleRateOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowRatingDialog(true);
  };

  const handleReorder = (order: Order) => {
    toast({
      title: language === 'ar' ? "جاري إعادة الطلب" : "Reordering",
      description: language === 'ar' ? `سيتم إضافة عناصر طلب ${order.orderNumber} إلى السلة` : `Items from order ${order.orderNumber} are being added`,
    });
  };

  const openCancelDialog = (order: Order) => {
    setCancellingOrder(order);
    setCancelReason('');
    setCustomCancelReason('');
    setShowCancelDialog(true);
  };

  const handleConfirmCancel = () => {
    if (!cancellingOrder) return;
    const finalReason = cancelReason === otherReasonKey ? customCancelReason.trim() : cancelReason;
    if (!finalReason) {
      toast({ 
        title: language === 'ar' ? "الرجاء اختيار سبب الإلغاء" : "Please choose a reason for cancellation", 
        variant: "destructive" 
      });
      return;
    }
    cancelOrderMutation.mutate({ orderId: cancellingOrder.id, reason: finalReason, isWasalni: cancellingOrder._isWasalni });
  };

  const tabs = [
    { id: 'all', label: language === 'ar' ? 'الكل' : 'All', count: displayOrders.length },
    { id: 'active', label: language === 'ar' ? 'قيد التنفيذ' : 'Active', count: displayOrders.filter(o => ['pending', 'confirmed', 'preparing', 'on_way', 'scheduled'].includes(o.status)).length },
    { id: 'completed', label: language === 'ar' ? 'تم التسليم' : 'Delivered', count: displayOrders.filter(o => o.status === 'delivered').length },
    { id: 'cancelled', label: language === 'ar' ? 'ملغي' : 'Cancelled', count: displayOrders.filter(o => o.status === 'cancelled').length }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F8FF] flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-[#0B5ED7]" />
          <p className="text-slate-600 font-bold">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F4F8FF] flex items-center justify-center">
        <div className="text-center p-6 bg-white rounded-3xl border border-blue-100 shadow-sm">
          <XCircle className="h-8 w-8 mx-auto mb-4 text-rose-500" />
          <p className="text-rose-600 font-bold mb-4">{language === 'ar' ? 'حدث خطأ في تحميل الطلبات' : 'Error loading orders'}</p>
          <Button onClick={() => window.location.reload()} className="bg-[#0B5ED7] hover:bg-[#0950BA] text-white rounded-full">
            {language === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F8FF] pb-24">
      {/* Al-Saidi Hero Header */}
      <div className="relative bg-gradient-to-br from-[#0B5ED7] via-[#0950BA] to-[#003B99] text-white shadow-lg rounded-b-[2.25rem] sticky top-0 z-10 overflow-hidden">
        <div className="absolute -bottom-1 left-0 right-0 h-2.5 bg-gradient-to-r from-[#FF6B00] via-[#FF8533] to-[#FF6B00]" />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="text-white bg-white/15 hover:bg-white/25 rounded-full backdrop-blur-sm"
                onClick={() => setLocation('/')}
                data-testid="button-back"
              >
                <ArrowRight className={`h-5 w-5 ${language === 'en' ? 'rotate-180' : ''}`} />
              </Button>
              <div>
                <h1 className="text-xl font-black text-white">{language === 'ar' ? 'أحدث الطلبات' : t('my_orders')}</h1>
                <p className="text-xs text-blue-100 font-semibold">
                  {language === 'ar' ? 'كل طلباتك في مكان واحد • الصايدي توصيل' : 'All your orders in one place • Al-Saidi Delivery'}
                </p>
              </div>
            </div>
            <img
              src="/assets/saidi-parcel-badge.jpg"
              alt="طلبات الصايدي"
              className="w-12 h-12 rounded-2xl object-cover border-2 border-white/30 shadow-md hidden sm:block"
            />
          </div>
        </div>
      </div>

      {/* التبويبات */}
      <div className="max-w-2xl mx-auto p-4">
        <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as any)}>
          <TabsList className="grid w-full grid-cols-4 mb-5 p-1.5 bg-white border border-blue-100/80 rounded-full shadow-xs h-auto">
            {tabs.map((tab) => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="text-xs font-black rounded-full py-2.5 px-2 data-[state=active]:bg-[#0B5ED7] data-[state=active]:text-white text-slate-600 relative transition-all"
                data-testid={`tab-${tab.id}`}
              >
                <span className="truncate">{tab.label}</span>
                {tab.count > 0 && (
                  <Badge variant="secondary" className="mr-1 h-4 min-w-4 px-1 rounded-full text-[10px] font-black bg-[#FF6B00] text-white border-none">
                    {tab.count}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedTab} className="space-y-4">
            {filteredOrders.length === 0 ? (
              <Card className="rounded-3xl border border-blue-100/80 shadow-[0_6px_24px_rgba(11,94,215,0.06)] overflow-hidden bg-white">
                <CardContent className="text-center py-12">
                  <div className="w-16 h-16 rounded-3xl bg-[#EEF5FF] border border-blue-100 flex items-center justify-center mx-auto mb-4 text-[#0B5ED7]">
                    <Package className="h-8 w-8 text-[#0B5ED7]" />
                  </div>
                  <h3 className="text-base font-black text-slate-900 mb-1">{t('no_orders')}</h3>
                  <p className="text-xs text-slate-400 font-bold mb-4">
                    {language === 'ar' ? 'لم تقم بأي طلبات في هذا القسم بعد' : 'You have no orders in this category yet'}
                  </p>
                  <Button 
                    onClick={() => setLocation('/')} 
                    data-testid="button-start-ordering"
                    className="bg-[#FF6B00] hover:bg-[#E55E00] text-white font-black rounded-full px-7 py-2.5 shadow-md shadow-orange-500/20"
                  >
                    {t('start_ordering')}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredOrders.map((order) => {
                const StatusIcon = getStatusIcon(order.status);
                
                return (
                  <Card key={order.id} className="rounded-3xl border border-blue-100/80 shadow-[0_6px_20px_rgba(11,94,215,0.05)] hover:shadow-[0_10px_28px_rgba(11,94,215,0.1)] transition-all overflow-hidden bg-white">
                    <CardHeader className="pb-3 bg-[#F4F8FF]/70 border-b border-blue-100/60">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src="/assets/saidi-parcel-badge.jpg"
                            alt=""
                            className="w-11 h-11 rounded-2xl object-cover border border-blue-100 shrink-0"
                          />
                          <div className="min-w-0">
                            <CardTitle className="text-base font-black text-slate-900 truncate">
                              {order.restaurantName || (language === 'ar' ? 'طلب الصايدي توصيل' : 'Al-Saidi Delivery Order')}
                            </CardTitle>
                            <p className="text-xs text-[#0B5ED7] font-black mt-0.5">
                              #{order.orderNumber}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant="outline"
                          className={`${getStatusBadgeClasses(order.status)} font-black text-xs px-3 py-1 rounded-full shrink-0`}
                          data-testid={`badge-status-${order.status}`}
                        >
                          <StatusIcon className={`w-3.5 h-3.5 ${language === 'ar' ? 'ml-1' : 'mr-1'}`} />
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4 pt-4">
                      {/* عناصر الطلب */}
                      <div className="space-y-2 bg-[#F4F8FF] p-3.5 rounded-2xl border border-blue-100/60">
                        {order.parsedItems?.map((item: OrderItem, index: number) => (
                          <div key={index} className="flex justify-between text-xs font-bold text-slate-700">
                            <span>{item.quantity}x {item.name}</span>
                            <span className="text-slate-900 font-black">{formatCurrency(item.price)}</span>
                          </div>
                        )) || (
                          <div className="text-xs text-slate-400 font-bold">
                            {language === 'ar' ? 'لا توجد تفاصيل العناصر' : 'No items details'}
                          </div>
                        )}
                      </div>

                      {/* ملخص الطلب */}
                      <div className="pt-1 space-y-1.5">
                        <div className="flex justify-between text-xs font-bold text-slate-600">
                          <span>
                            {language === 'ar' ? 'عدد الأصناف:' : 'Items count:'} {order.parsedItems?.reduce((sum: number, item: OrderItem) => sum + item.quantity, 0) || 0}
                          </span>
                          <span className="text-[#FF6B00] font-black text-sm">
                            {language === 'ar' ? 'المجموع:' : 'Total:'} {formatCurrency(order.totalAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400 font-bold">
                          <span>
                            {language === 'ar' ? 'تاريخ الطلب:' : 'Date:'} {formatDate(order.createdAt)} - {new Date(order.createdAt).toLocaleTimeString(language === 'ar' ? 'ar-YE' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {order.estimatedTime && (
                            <span className="text-[#0B5ED7]">
                              {language === 'ar' ? 'الوقت المتوقع:' : 'Est. time:'} {order.estimatedTime}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500 font-bold gap-2">
                          <span className="truncate">{t('delivery_address')}: {order.deliveryAddress}</span>
                          <span className="shrink-0">{t('payment_method')}: {order.paymentMethod === 'cash' ? t('cash_on_delivery') : t('online_payment')}</span>
                        </div>
                      </div>

                      {/* أزرار الإجراءات */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-blue-50">
                        <Button
                          size="sm"
                          className="flex-1 rounded-full font-black text-xs bg-[#0B5ED7] hover:bg-[#0950BA] text-white shadow-xs"
                          onClick={() => handleViewOrder(order.id)}
                          data-testid={`button-view-order-${order.id}`}
                        >
                          <Eye className={`w-3.5 h-3.5 ${language === 'ar' ? 'ml-1' : 'mr-1'}`} />
                          {t('track_order')}
                        </Button>

                        {canCancelOrder(order.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 rounded-full font-black text-xs border-rose-200 text-rose-600 hover:bg-rose-50"
                            onClick={() => openCancelDialog(order)}
                            data-testid={`button-cancel-order-${order.id}`}
                          >
                            <X className={`w-3.5 h-3.5 ${language === 'ar' ? 'ml-1' : 'mr-1'}`} />
                            {language === 'ar' ? 'إلغاء الطلب' : 'Cancel Order'}
                          </Button>
                        )}
                        
                        {order.status === 'delivered' && !order.isRated && (
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1 rounded-full font-black text-xs bg-[#FF6B00] hover:bg-[#E55E00] text-white shadow-xs"
                            onClick={() => handleRateOrder(order)}
                          >
                            <Star className={`w-3.5 h-3.5 fill-white ${language === 'ar' ? 'ml-1' : 'mr-1'}`} />
                            {language === 'ar' ? 'تقييم' : 'Rate'}
                          </Button>
                        )}

                        {order.status === 'on_way' && order.driverPhone && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 rounded-full font-black text-xs border-blue-200 text-[#0B5ED7] hover:bg-[#EEF5FF]"
                            onClick={() => window.location.href = `tel:${order.driverPhone}`}
                          >
                            <Phone className={`w-3.5 h-3.5 ${language === 'ar' ? 'ml-1' : 'mr-1'}`} />
                            {language === 'ar' ? 'اتصال بالسائق' : 'Call Driver'}
                          </Button>
                        )}
                        
                        {order.status === 'delivered' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 rounded-full font-black text-xs border-blue-200 hover:bg-[#EEF5FF] text-[#0B5ED7]"
                            onClick={() => handleReorder(order)}
                            data-testid={`button-reorder-${order.id}`}
                          >
                            {t('reorder')}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>

        {selectedOrder && (
          <RatingDialog
            isOpen={showRatingDialog}
            onClose={() => {
              setShowRatingDialog(false);
              setSelectedOrder(null);
            }}
            orderId={selectedOrder.id}
            restaurantName={selectedOrder.restaurantName || (language === 'ar' ? "المتجر" : "Store")}
            driverName={selectedOrder.driverName}
            customerId={selectedOrder.customerId || user?.id}
          />
        )}
      </div>

      {/* نافذة إلغاء الطلب */}
      {showCancelDialog && cancellingOrder && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-blue-100">
            <div className="bg-rose-600 px-5 py-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  <h3 className="font-black text-lg">
                    {language === 'ar' ? 'إلغاء الطلب' : 'Cancel Order'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowCancelDialog(false)}
                  className="text-white/80 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-white/80 text-sm mt-1">
                {language === 'ar' ? 'طلب رقم:' : 'Order #:'} {cancellingOrder.orderNumber}
              </p>
            </div>

            <div className="px-5 py-4">
              <p className="text-slate-700 font-bold text-sm mb-4">
                {language === 'ar' ? 'يرجى اختيار سبب الإلغاء:' : 'Please select cancellation reason:'}
              </p>

              <div className="space-y-2 mb-4">
                {CANCEL_REASONS.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setCancelReason(reason)}
                    className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} px-4 py-3 rounded-2xl border-2 transition-all text-sm font-bold ${
                      cancelReason === reason
                        ? 'border-rose-500 bg-rose-50 text-rose-700'
                        : 'border-blue-50 bg-[#F4F8FF] hover:border-blue-200 text-slate-700'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              {cancelReason === otherReasonKey && (
                <textarea
                  placeholder={language === 'ar' ? "اكتب سبب الإلغاء..." : "Write cancellation reason..."}
                  value={customCancelReason}
                  onChange={(e) => setCustomCancelReason(e.target.value)}
                  className="w-full p-3 border-2 border-blue-100 rounded-2xl text-sm focus:border-rose-400 outline-none resize-none mb-4"
                  rows={3}
                />
              )}

              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  className="flex-1 rounded-full font-black"
                  onClick={handleConfirmCancel}
                  disabled={cancelOrderMutation.isPending || !cancelReason || (cancelReason === otherReasonKey && !customCancelReason.trim())}
                >
                  {cancelOrderMutation.isPending ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    language === 'ar' ? 'تأكيد الإلغاء' : 'Confirm Cancel'
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 rounded-full font-bold border-blue-200 text-[#0B5ED7]"
                  onClick={() => setShowCancelDialog(false)}
                  disabled={cancelOrderMutation.isPending}
                >
                  {t('cancel')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
