import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, ArrowLeft, Search, Package, MapPin, Clock, Phone, Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useUiSettings } from '@/context/UiSettingsContext';
import { safeTriggerPhoneCall, safeOpenWhatsApp } from '@/lib/callUtils';

export default function TrackOrdersPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { getSetting } = useUiSettings();
  const [searchOrderNumber, setSearchOrderNumber] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  const supportPhone = getSetting('support_phone') || '967777146387';
  const supportWhatsapp = getSetting('support_whatsapp') || '967777146387';
  const customerPhone = user?.phone || localStorage.getItem('customer_phone') || '';

  const { data: regularOrders = [], isLoading: loadingOrders } = useQuery<any[]>({
    queryKey: ['/api/orders/customer', customerPhone],
    enabled: !!customerPhone,
    queryFn: async () => {
      const res = await fetch(`/api/orders/customer/${customerPhone}`);
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: wasalniOrders = [], isLoading: loadingWasalni } = useQuery<any[]>({
    queryKey: ['/api/wasalni', { phone: customerPhone }],
    enabled: !!customerPhone,
    queryFn: async () => {
      const res = await fetch(`/api/wasalni?phone=${customerPhone}`);
      if (!res.ok) return [];
      return res.json();
    }
  });

  const activeOrders = [
    ...regularOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)),
    ...wasalniOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)).map(o => ({
      ...o,
      orderNumber: o.requestNumber,
      restaurantName: 'طلب توصيل خاص',
      isWaselLi: true
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleSearchOrder = async () => {
    if (!searchOrderNumber.trim()) {
      toast({
        title: "أدخل رقم الطلب",
        description: "يرجى إدخال رقم الطلب للبحث",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/orders/number/${searchOrderNumber}`);
      if (res.ok) {
        const data = await res.json();
        setSearchedOrder(data);
      } else {
        const resW = await fetch(`/api/wasalni/number/${searchOrderNumber}`);
        if (resW.ok) {
          const dataW = await resW.json();
          setSearchedOrder({
            ...dataW,
            orderNumber: dataW.requestNumber,
            restaurantName: 'طلب توصيل خاص',
            isWaselLi: true
          });
        } else {
          setSearchedOrder(null);
          toast({
            title: "طلب غير موجود",
            description: "لم يتم العثور على طلب بهذا الرقم",
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap = {
      pending: 'قيد المراجعة',
      confirmed: 'مؤكد',
      preparing: 'قيد التجهيز',
      on_way: 'قيد التوصيل',
      delivered: 'تم التسليم'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getStatusBadgeClasses = (status: string) => {
    const colorMap = {
      pending: 'bg-amber-100 text-amber-800',
      confirmed: 'bg-sky-100 text-[#0B5ED7]',
      preparing: 'bg-orange-100 text-[#FF6B00]',
      on_way: 'bg-[#EEF5FF] text-[#0B5ED7]',
      delivered: 'bg-emerald-100 text-emerald-700'
    };
    return colorMap[status as keyof typeof colorMap] || 'bg-slate-100 text-slate-700';
  };

  const handleViewFullTracking = (orderId: string) => {
    setLocation(`/orders/${orderId}`);
  };

  return (
    <div className="min-h-screen bg-[#F4F8FF] pb-24" dir="rtl">
      {/* Curved Hero Header */}
      <div className="relative bg-gradient-to-br from-[#0B5ED7] via-[#0950BA] to-[#003B99] text-white sticky top-0 z-10 rounded-b-[2.25rem] shadow-lg overflow-hidden">
        <div className="absolute -bottom-1 left-0 right-0 h-2.5 bg-gradient-to-r from-[#FF6B00] via-[#FF8533] to-[#FF6B00]" />
        <div className="max-w-lg mx-auto px-4 pt-4 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation('/')}
                data-testid="button-back"
                className="rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur-sm"
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-black text-white">متابعة الطلبات</h1>
                <p className="text-xs text-blue-100 font-semibold">تابع طلبك لحظة بلحظة • الصايدي توصيل</p>
              </div>
            </div>
            <img
              src="/assets/saidi-parcel-badge.jpg"
              alt=""
              className="w-11 h-11 rounded-2xl object-cover border-2 border-white/30 shadow-sm hidden sm:block"
            />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-5">
        {/* Search Section */}
        <Card className="rounded-3xl border border-blue-100/80 shadow-[0_6px_24px_rgba(11,94,215,0.06)] overflow-hidden bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-black text-slate-800">
              <Search className="h-4 w-4 text-[#0B5ED7]" />
              البحث عن طلب محدد
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="أدخل رقم الطلب..."
                value={searchOrderNumber}
                onChange={(e) => setSearchOrderNumber(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchOrder()}
                className="rounded-full h-12 bg-[#F4F8FF] border-blue-100 focus:bg-white focus:border-[#0B5ED7] px-4"
                data-testid="input-search-order"
              />
              <Button 
                onClick={handleSearchOrder}
                disabled={isSearching}
                className="rounded-full h-12 px-6 bg-[#0B5ED7] hover:bg-[#0950BA] text-white font-black shadow-sm"
                data-testid="button-search-order"
              >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'بحث'}
              </Button>
            </div>
            
            {searchedOrder && (
              <div className="animate-in fade-in slide-in-from-top-2 p-4 bg-[#EEF5FF] rounded-2xl border border-blue-200">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-[#0B5ED7] text-sm">طلب #{searchedOrder.orderNumber}</span>
                    <Badge className={`${getStatusBadgeClasses(searchedOrder.status)} border-none rounded-full text-[11px] font-black`}>
                      {getStatusLabel(searchedOrder.status)}
                    </Badge>
                  </div>
                  <p className="text-xs font-bold text-slate-700">{searchedOrder.restaurantName || 'طلب متجر'}</p>
                  <Button
                    size="sm"
                    className="w-full mt-2 rounded-full bg-[#0B5ED7] hover:bg-[#0950BA] text-white font-black h-10 shadow-sm"
                    onClick={() => handleViewFullTracking(searchedOrder.id)}
                    data-testid="button-view-searched-order"
                  >
                    عرض صفحة التتبع المباشر
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Orders */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-black text-slate-700 px-1">
            <Clock className="h-4 w-4 text-[#0B5ED7]" />
            طلباتك الحالية
          </h3>

          {(loadingOrders || loadingWasalni) ? (
            <div className="flex flex-col items-center py-10 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin mb-2 text-[#0B5ED7]" />
              <p className="text-xs font-bold">جاري تحديث الطلبات...</p>
            </div>
          ) : activeOrders.length > 0 ? (
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <div 
                  key={order.id}
                  className="p-4 sm:p-5 bg-white rounded-3xl border border-blue-100/80 shadow-[0_6px_20px_rgba(11,94,215,0.05)] hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => handleViewFullTracking(order.id)}
                  data-testid={`order-card-${order.id}`}
                >
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div className="min-w-0">
                      <h3 className="font-black text-slate-900 group-hover:text-[#0B5ED7] transition-colors truncate">{order.restaurantName}</h3>
                      <p className="text-xs font-black text-[#0B5ED7] mt-0.5">#{order.orderNumber}</p>
                    </div>
                    <Badge className={`${getStatusBadgeClasses(order.status)} border-none rounded-full text-[11px] font-black shrink-0`}>
                      {getStatusLabel(order.status)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-blue-50">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#EEF5FF] flex items-center justify-center">
                        <Package className="h-4 w-4 text-[#0B5ED7]" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-500">الحالة: {getStatusLabel(order.status)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#0B5ED7] bg-[#EEF5FF] px-3 py-1.5 rounded-full">
                      <span className="text-xs font-black">تتبع</span>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-14 bg-white rounded-3xl border border-dashed border-blue-200">
              <Package className="h-10 w-10 text-blue-200 mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-500">لا توجد طلبات نشطة حالياً</p>
              <Button 
                className="mt-4 bg-[#FF6B00] hover:bg-[#E55E00] text-white font-black text-xs rounded-full px-6"
                onClick={() => setLocation('/')}
              >
                اطلب الآن
              </Button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2 rounded-3xl border border-blue-100/80 shadow-xs bg-white hover:bg-[#EEF5FF] transition-all group"
            onClick={() => setLocation('/orders')}
          >
            <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center text-[#FF6B00] group-hover:bg-[#FF6B00] group-hover:text-white transition-all">
              <Package className="h-5 w-5" />
            </div>
            <span className="text-xs font-black text-slate-800">تاريخ الطلبات</span>
          </Button>
          
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2 rounded-3xl border border-blue-100/80 shadow-xs bg-white hover:bg-[#EEF5FF] transition-all group"
            onClick={() => setLocation('/my-addresses')}
          >
            <div className="w-10 h-10 rounded-2xl bg-[#EEF5FF] flex items-center justify-center text-[#0B5ED7] group-hover:bg-[#0B5ED7] group-hover:text-white transition-all">
              <MapPin className="h-5 w-5" />
            </div>
            <span className="text-xs font-black text-slate-800">عناويني</span>
          </Button>
        </div>

        {/* Contact Support */}
        <div className="bg-gradient-to-br from-[#0B5ED7] via-[#0950BA] to-[#003B99] rounded-3xl p-6 text-white shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-14 -mt-14" />
          <h3 className="font-black text-lg mb-1.5 relative z-10">هل تواجه مشكلة؟</h3>
          <p className="text-xs text-blue-100 font-semibold mb-5 relative z-10 leading-relaxed">
            فريق دعم الصايدي توصيل متواجد لمساعدتك في متابعة طلبك أو حل أي مشكلة قد تواجهك.
          </p>
          <div className="flex gap-3 relative z-10">
            <Button
              className="flex-1 rounded-full bg-white text-[#0B5ED7] font-black hover:bg-blue-50 h-11 text-xs gap-2"
              onClick={() => safeTriggerPhoneCall(supportPhone)}
            >
              <Phone className="h-3.5 w-3.5" />
              اتصال سريع
            </Button>
            <Button
              className="flex-1 rounded-full bg-[#FF6B00] hover:bg-[#E55E00] text-white font-black h-11 text-xs gap-2"
              onClick={() => safeOpenWhatsApp(supportWhatsapp, 'السلام عليكم، أحتاج مساعدة بخصوص متابعة طلبي')}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              واتساب
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
