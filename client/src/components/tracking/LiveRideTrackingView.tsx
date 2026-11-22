import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  ArrowRight, 
  ArrowLeft, 
  Phone, 
  MessageCircle, 
  Shield, 
  Navigation, 
  ChevronUp, 
  ChevronDown, 
  Share2, 
  Clock, 
  MapPin, 
  Package, 
  CheckCircle2, 
  Star, 
  X, 
  Store,
  Bike,
  ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { OrderChatModal } from '@/components/OrderChatModal';
import { safeTriggerPhoneCall, safeOpenWhatsApp } from '@/lib/callUtils';

// Al-Saidi Royal Blue & Orange Courier Pin Marker
const createCourierVehicleIcon = (heading: number = 0) => {
  const svg = `
    <div style="transform: rotate(${heading}deg); transition: transform 0.4s ease-out; display: flex; align-items: center; justify-content: center; width: 52px; height: 52px; position: relative;">
      <div style="position: absolute; top: -10px; width: 22px; height: 16px; background: radial-gradient(ellipse at bottom, rgba(11,94,215,0.45) 0%, rgba(11,94,215,0) 80%); border-radius: 50% 50% 0 0; pointer-events: none;"></div>
      <div style="width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #0B5ED7 0%, #003B99 100%); border: 3px solid #FF6B00; box-shadow: 0 6px 16px rgba(11,94,215,0.45); display: flex; align-items: center; justify-content: center; color: #ffffff;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="18.5" cy="17.5" r="3.5"/>
          <circle cx="5.5" cy="17.5" r="3.5"/>
          <circle cx="15" cy="5" r="1"/>
          <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
        </svg>
      </div>
    </div>
  `;
  return L.divIcon({
    html: svg,
    className: 'custom-vehicle-marker',
    iconSize: [52, 52],
    iconAnchor: [26, 26],
  });
};

// SVG Icon for Pickup Point (Store / Restaurant / Pickup)
const createPickupIcon = (label?: string) => {
  const svg = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
      <div style="width: 32px; height: 32px; border-radius: 50%; background: #0B5ED7; border: 3px solid #ffffff; box-shadow: 0 4px 12px rgba(11,94,215,0.4); display: flex; align-items: center; justify-content: center; color: white;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2"/>
          <path d="M12 20v2"/>
          <path d="M20 12h2"/>
          <path d="M2 12h2"/>
        </svg>
      </div>
      ${label ? `<div style="background: #ffffff; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 800; color: #1e293b; box-shadow: 0 2px 8px rgba(0,0,0,0.15); margin-top: 4px; white-space: nowrap; max-width: 140px; overflow: hidden; text-overflow: ellipsis; border: 1px solid #dbeafe;">${label}</div>` : ''}
    </div>
  `;
  return L.divIcon({
    html: svg,
    className: 'custom-pickup-marker',
    iconSize: [140, 60],
    iconAnchor: [70, 16],
  });
};

// SVG Icon for Destination Point (Home / Customer)
const createDestinationIcon = (label?: string) => {
  const svg = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
      <div style="width: 34px; height: 34px; border-radius: 50%; background: #FF6B00; border: 3px solid #ffffff; box-shadow: 0 4px 12px rgba(255,107,0,0.45); display: flex; align-items: center; justify-content: center; color: white;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
      ${label ? `<div style="background: #ffffff; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 800; color: #1e293b; box-shadow: 0 2px 8px rgba(0,0,0,0.15); margin-top: 4px; white-space: nowrap; max-width: 140px; overflow: hidden; text-overflow: ellipsis; border: 1px solid #fed7aa;">${label}</div>` : ''}
    </div>
  `;
  return L.divIcon({
    html: svg,
    className: 'custom-dest-marker',
    iconSize: [140, 60],
    iconAnchor: [70, 17],
  });
};

function MapController({ 
  driverPos, 
  pickupPos, 
  destPos, 
  recenterTrigger 
}: { 
  driverPos?: [number, number]; 
  pickupPos?: [number, number]; 
  destPos?: [number, number]; 
  recenterTrigger: number;
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [];
    if (driverPos) points.push(driverPos);
    if (pickupPos) points.push(pickupPos);
    if (destPos) points.push(destPos);

    if (points.length >= 2) {
      const bounds = L.latLngBounds(points.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 16, animate: true, duration: 1 });
    } else if (driverPos) {
      map.flyTo(driverPos, 16, { animate: true, duration: 0.8 });
    } else if (destPos) {
      map.flyTo(destPos, 15, { animate: true, duration: 0.8 });
    }
  }, [map, recenterTrigger]);

  return null;
}

export interface LiveRideTrackingViewProps {
  order: any;
  driverLocation?: [number, number] | null;
  onBack: () => void;
  onCancelOrder?: () => void;
  canCancel?: boolean;
}

export default function LiveRideTrackingView({
  order,
  driverLocation,
  onBack,
  onCancelOrder,
  canCancel = false
}: LiveRideTrackingViewProps) {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const isRTL = language === 'ar';

  const [chatOpen, setChatOpen] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [recenterCount, setRecenterCount] = useState(0);

  const destCoords: [number, number] = useMemo(() => {
    const lat = parseFloat(order.customerLocationLat || order.toLat || '15.3694');
    const lng = parseFloat(order.customerLocationLng || order.toLng || '44.1910');
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      return [lat, lng];
    }
    return [15.3694, 44.1910];
  }, [order.customerLocationLat, order.customerLocationLng, order.toLat, order.toLng]);

  const pickupCoords: [number, number] = useMemo(() => {
    const lat = parseFloat(order.pickupLocationLat || order.restaurantLatitude || order.fromLat || '15.3600');
    const lng = parseFloat(order.pickupLocationLng || order.restaurantLongitude || order.fromLng || '44.1800');
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      return [lat, lng];
    }
    return [destCoords[0] - 0.008, destCoords[1] - 0.008];
  }, [order.pickupLocationLat, order.restaurantLatitude, order.fromLat, order.pickupLocationLng, order.restaurantLongitude, order.fromLng, destCoords]);

  const currentDriverPos: [number, number] = useMemo(() => {
    if (driverLocation && !isNaN(driverLocation[0]) && !isNaN(driverLocation[1])) {
      return driverLocation;
    }
    if (order.driverLatitude && order.driverLongitude) {
      const lat = parseFloat(order.driverLatitude);
      const lng = parseFloat(order.driverLongitude);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    return [
      pickupCoords[0] + (destCoords[0] - pickupCoords[0]) * 0.55,
      pickupCoords[1] + (destCoords[1] - pickupCoords[1]) * 0.55
    ];
  }, [driverLocation, order.driverLatitude, order.driverLongitude, pickupCoords, destCoords]);

  const routePoints: [number, number][] = useMemo(() => {
    const mid1: [number, number] = [
      pickupCoords[0] + (destCoords[0] - pickupCoords[0]) * 0.35 + 0.001,
      pickupCoords[1] + (destCoords[1] - pickupCoords[1]) * 0.25 - 0.0015
    ];
    const mid2: [number, number] = [
      pickupCoords[0] + (destCoords[0] - pickupCoords[0]) * 0.7 + 0.0005,
      pickupCoords[1] + (destCoords[1] - pickupCoords[1]) * 0.75 + 0.001
    ];
    return [pickupCoords, mid1, mid2, destCoords];
  }, [pickupCoords, destCoords]);

  const vehicleHeading = useMemo(() => {
    const dLat = destCoords[0] - currentDriverPos[0];
    const dLng = destCoords[1] - currentDriverPos[1];
    const angleRad = Math.atan2(dLng, dLat);
    return (angleRad * 180) / Math.PI;
  }, [currentDriverPos, destCoords]);

  const pinDigits = useMemo(() => {
    const pinStr = String(order.deliveryPin || order.orderNumber?.slice(-4) || '1921').replace(/\D/g, '');
    const padded = (pinStr + '1921').slice(0, 4);
    return padded.split('');
  }, [order.deliveryPin, order.orderNumber]);

  const driverName = order.driverName || (language === 'ar' ? 'محمد علي' : 'Mohammed Ali');
  const driverRating = order.driverRating || '4.9';
  const vehiclePlate = order.driverVehiclePlate || 'ص ع د 8990';
  const vehicleModel = order.driverVehicleModel || (language === 'ar' ? 'دراجة توصيل سريعة' : 'Express Courier');
  const driverPhone = order.driverPhone || '';

  const statusHeadline = useMemo(() => {
    switch (order.status) {
      case 'on_way':
        return language === 'ar' ? 'المندوب في طريقه إليك' : 'Courier is on the way to you';
      case 'picked_up':
        return language === 'ar' ? 'المندوب استلم طلبك وفي الطريق' : 'Courier picked up your order';
      case 'preparing':
        return language === 'ar' ? 'جاري تجهيز طلبك من المتجر' : 'Order is being prepared';
      case 'assigned':
      case 'confirmed':
        return language === 'ar' ? 'المندوب متوجه لنقطة الاستلام' : 'Courier heading to pickup point';
      case 'delivered':
        return language === 'ar' ? 'تم تسليم الطلب بنجاح' : 'Order delivered successfully';
      case 'cancelled':
        return language === 'ar' ? 'تم إلغاء الطلب' : 'Order was cancelled';
      default:
        return language === 'ar' ? 'المندوب في طريقه إليك' : 'Courier is on the way';
    }
  }, [order.status, language]);

  const activeStepIndex = useMemo(() => {
    if (order.status === 'delivered') return 3;
    if (['on_way', 'picked_up'].includes(order.status)) return 2;
    if (['preparing', 'ready', 'confirmed', 'assigned'].includes(order.status)) return 1;
    return 0;
  }, [order.status]);

  const stepperSteps = [
    { label: language === 'ar' ? 'تم الطلب' : 'Ordered', icon: ClipboardList },
    { label: language === 'ar' ? 'قيد التجهيز' : 'Preparing', icon: Package },
    { label: language === 'ar' ? 'قيد التوصيل' : 'Delivering', icon: Bike },
    { label: language === 'ar' ? 'تم التسليم' : 'Delivered', icon: CheckCircle2 },
  ];

  const formattedEta = useMemo(() => {
    if (order.estimatedTime) return order.estimatedTime;
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15);
    return now.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }, [order.estimatedTime, language]);

  const handleShareTrip = () => {
    if (navigator.share) {
      navigator.share({
        title: `تتبع طلب الصايدي توصيل ${order.orderNumber || ''}`,
        text: `تتبع مباشر لطلبي عبر تطبيق الصايدي توصيل: رمز الاستلام ${pinDigits.join('')}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: language === 'ar' ? 'تم نسخ رابط التتبع' : 'Tracking link copied',
        description: language === 'ar' ? 'يمكنك مشاركة الرابط مع عائلتك أو أصدقائك' : 'You can share this link with friends or family'
      });
    }
  };

  const handleCallDriver = () => {
    if (driverPhone) {
      safeTriggerPhoneCall(driverPhone);
    } else {
      toast({
        title: language === 'ar' ? 'رقم المندوب غير متوفر' : 'Driver phone unavailable',
        description: language === 'ar' ? 'يمكنك مراسلة المندوب عبر الدردشة الفورية' : 'Please use in-app chat'
      });
    }
  };

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#F4F8FF] flex flex-col select-none" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* 1. Full-Screen Interactive Leaflet Map */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={currentDriverPos}
          zoom={15}
          zoomControl={false}
          attributionControl={false}
          className="w-full h-full"
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            maxZoom={19}
          />

          <MapController
            driverPos={currentDriverPos}
            pickupPos={pickupCoords}
            destPos={destCoords}
            recenterTrigger={recenterCount}
          />

          {/* Royal Blue Route Polyline */}
          <Polyline
            positions={routePoints}
            pathOptions={{
              color: '#0B5ED7',
              weight: 6,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round'
            }}
          />
          
          {/* Soft Sky Outer Polyline Glow */}
          <Polyline
            positions={routePoints}
            pathOptions={{
              color: '#60A5FA',
              weight: 12,
              opacity: 0.3,
              lineCap: 'round',
              lineJoin: 'round'
            }}
          />

          <Marker
            position={pickupCoords}
            icon={createPickupIcon(order.restaurantName || order.pickupAddress || (language === 'ar' ? 'نقطة الاستلام' : 'Pickup Point'))}
          />

          <Marker
            position={destCoords}
            icon={createDestinationIcon(order.deliveryAddress || (language === 'ar' ? 'موقعك' : 'Your Location'))}
          />

          <Marker
            position={currentDriverPos}
            icon={createCourierVehicleIcon(vehicleHeading)}
          />
        </MapContainer>
      </div>

      {/* 2. Top Floating Controls */}
      <div className="relative z-10 p-4 pt-6 flex items-center justify-between pointer-events-none">
        <button
          onClick={onBack}
          className="pointer-events-auto w-11 h-11 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-blue-100 flex items-center justify-center text-[#0B5ED7] hover:bg-[#EEF5FF] active:scale-95 transition-all"
          title={language === 'ar' ? 'رجوع' : 'Back'}
        >
          {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setShowSafetyModal(true)}
            className="w-11 h-11 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-blue-100 flex items-center justify-center text-[#FF6B00] hover:bg-orange-50 active:scale-95 transition-all relative"
            title={language === 'ar' ? 'مركز الأمان والدعم' : 'Safety & Support'}
          >
            <Shield className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FF6B00] animate-ping"></span>
          </button>

          <button
            onClick={() => setRecenterCount(prev => prev + 1)}
            className="w-11 h-11 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-blue-100 flex items-center justify-center text-[#0B5ED7] hover:bg-[#EEF5FF] active:scale-95 transition-all"
            title={language === 'ar' ? 'إعادة التوسيط على المندوب' : 'Recenter map'}
          >
            <Navigation className="w-5 h-5 text-[#0B5ED7]" />
          </button>
        </div>
      </div>

      <div className="flex-1 pointer-events-none" />

      {/* 3. Al-Saidi Floating Bottom Sheet */}
      <div className="relative z-20 w-full max-w-lg mx-auto p-3 pb-5 pointer-events-auto">
        <div className="bg-white rounded-[28px] shadow-[0_12px_40px_rgba(11,94,215,0.2)] border border-blue-100 overflow-hidden transition-all duration-300">
          {/* Top Status & ETA Bar */}
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-blue-50 bg-[#F4F8FF]/60">
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0B5ED7] animate-pulse"></span>
              {statusHeadline}
            </h2>

            <div className="bg-[#EEF5FF] text-[#0B5ED7] font-black text-xs px-3 py-1.5 rounded-full border border-blue-200 shadow-2xs flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#0B5ED7]" />
              <span>{formattedEta}</span>
            </div>
          </div>

          {/* 4-Step Tracking Stepper */}
          {order.status !== 'cancelled' && (
            <div className="px-4 py-3 border-b border-blue-50 grid grid-cols-4 gap-1 bg-white">
              {stepperSteps.map((st, idx) => {
                const Icon = st.icon;
                const isDone = idx < activeStepIndex;
                const isCurrent = idx === activeStepIndex;
                return (
                  <div key={idx} className="flex flex-col items-center text-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                      isCurrent
                        ? 'bg-[#0B5ED7] text-white border-blue-200 ring-4 ring-blue-100'
                        : isDone
                          ? 'bg-emerald-500 text-white border-emerald-200'
                          : 'bg-[#F4F8FF] text-slate-400 border-blue-100'
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className={`text-[10px] font-black mt-1 leading-tight ${
                      isCurrent ? 'text-[#0B5ED7]' : isDone ? 'text-emerald-600' : 'text-slate-400'
                    }`}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Security PIN Code Boxes */}
          <div className="px-5 py-3 bg-[#F4F8FF]/50 border-b border-blue-50 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-600 max-w-[190px]">
              {language === 'ar' 
                ? 'استخدم رمز التحقق لتأكيد الاستلام' 
                : 'Use PIN code to confirm order delivery'}
            </p>

            <div className="flex items-center gap-1.5" dir="ltr">
              {pinDigits.map((digit, idx) => (
                <div
                  key={idx}
                  className="w-8 h-9 rounded-xl bg-[#EEF5FF] border border-blue-200 flex items-center justify-center font-black text-base text-[#0B5ED7] shadow-2xs"
                >
                  {digit}
                </div>
              ))}
            </div>
          </div>

          {/* Driver & Vehicle Details Profile */}
          <div className="px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-13 h-13 rounded-2xl bg-[#EEF5FF] border-2 border-[#0B5ED7]/30 p-0.5 shadow-sm overflow-hidden flex items-center justify-center">
                  <img
                    src="/assets/saidi-driver-avatar.jpg"
                    alt={driverName}
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                <div className="absolute -bottom-1.5 -right-1 bg-white text-slate-800 font-black text-[10px] px-1.5 py-0.5 rounded-full border border-blue-100 shadow-xs flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                  <span>{driverRating}</span>
                </div>
              </div>

              <div>
                <h3 className="font-black text-sm text-slate-900">{driverName}</h3>
                <p className="text-[11px] font-bold text-[#0B5ED7] mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[#0B5ED7]" />
                  {language === 'ar' ? 'مندوب الصايدي المعتمد' : 'Al-Saidi Verified Partner'}
                </p>
              </div>
            </div>

            <div className={`text-${isRTL ? 'left' : 'right'}`}>
              <div className="text-sm sm:text-base font-black text-slate-900 tracking-wider">
                {vehiclePlate}
              </div>
              <div className="text-xs font-bold text-slate-500 mt-0.5">
                {vehicleModel}
              </div>
            </div>
          </div>

          {/* Action Bar (Chat with Driver & Call) */}
          <div className="px-5 pb-4 pt-1 flex items-center gap-2.5">
            <button
              onClick={() => setChatOpen(true)}
              className="flex-1 py-3 px-4 rounded-full bg-[#0B5ED7] hover:bg-[#0950BA] active:scale-[0.98] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20"
            >
              <MessageCircle className="w-4 h-4 text-white" />
              <span>
                {language === 'ar' ? `مراسلة ${driverName}` : `Message ${driverName}`}
              </span>
            </button>

            <button
              onClick={handleCallDriver}
              className="w-12 h-12 rounded-full bg-[#EEF5FF] hover:bg-blue-100 active:scale-95 text-[#0B5ED7] flex items-center justify-center transition-all border border-blue-200 shadow-xs"
              title={language === 'ar' ? 'اتصال بالمندوب' : 'Call courier'}
            >
              <Phone className="w-4 h-4 text-[#0B5ED7]" />
            </button>

            <button
              onClick={() => setShowDetailsDrawer(prev => !prev)}
              className="w-12 h-12 rounded-full bg-[#F4F8FF] hover:bg-blue-100 active:scale-95 text-slate-800 flex items-center justify-center transition-all border border-blue-100 shadow-xs"
              title={language === 'ar' ? 'تفاصيل الطلب' : 'Order details'}
            >
              {showDetailsDrawer ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </button>
          </div>

          {/* Expandable Order Details Drawer */}
          {showDetailsDrawer && (
            <div className="px-5 pt-3 pb-4 bg-[#F4F8FF] border-t border-blue-100 max-h-[45vh] overflow-y-auto space-y-3 animate-in slide-in-from-bottom duration-200">
              <div className="bg-white p-3.5 rounded-2xl border border-blue-100 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#EEF5FF] text-[#0B5ED7] flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                    <Store className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 text-xs">
                    <span className="font-bold text-slate-400 block">{language === 'ar' ? 'نقطة الاستلام' : 'Pickup Location'}</span>
                    <span className="font-black text-slate-800">{order.restaurantName || order.pickupAddress || (language === 'ar' ? 'المتجر الرئيسي' : 'Main Store')}</span>
                  </div>
                </div>

                <div className="h-px bg-blue-50 ml-10 mr-2" />

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-orange-50 text-[#FF6B00] flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 text-xs">
                    <span className="font-bold text-slate-400 block">{language === 'ar' ? 'عنوان التوصيل' : 'Delivery Address'}</span>
                    <span className="font-black text-slate-800">{order.deliveryAddress}</span>
                  </div>
                </div>
              </div>

              {Array.isArray(order.items) && order.items.length > 0 && (
                <div className="bg-white p-3.5 rounded-2xl border border-blue-100">
                  <h4 className="font-black text-xs text-slate-800 mb-2 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-[#0B5ED7]" />
                    {language === 'ar' ? 'عناصر الطلب' : 'Order Items'}
                  </h4>
                  <div className="space-y-1.5">
                    {order.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-xs font-bold text-slate-700">
                        <span>{item.quantity}x {item.name}</span>
                        <span className="font-black text-slate-900">{item.price * item.quantity} {t('currency_riyal')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-[#EEF5FF] p-3.5 rounded-2xl border border-blue-200 flex justify-between items-center">
                <span className="text-xs font-black text-slate-800">{language === 'ar' ? 'إجمالي الطلب:' : 'Total Amount:'}</span>
                <span className="text-sm font-black text-[#FF6B00]">{order.total || order.totalAmount || '0'} {t('currency_riyal')}</span>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareTrip}
                  className="flex-1 rounded-full text-xs font-black border-blue-200 text-[#0B5ED7] hover:bg-blue-50"
                >
                  <Share2 className="w-3.5 h-3.5 mr-1 ml-1" />
                  {language === 'ar' ? 'مشاركة التتبع' : 'Share Tracking'}
                </Button>

                {canCancel && onCancelOrder && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCancelOrder}
                    className="flex-1 rounded-full text-xs font-black border-rose-200 text-rose-600 hover:bg-rose-50"
                  >
                    <X className="w-3.5 h-3.5 mr-1 ml-1" />
                    {language === 'ar' ? 'إلغاء الطلب' : 'Cancel Order'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Safety & Help Modal */}
      {showSafetyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-blue-100 animate-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-[#0B5ED7] to-[#003B99] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-white" />
                <h3 className="font-black text-base">{language === 'ar' ? 'مركز الأمان والدعم' : 'Safety & Support'}</h3>
              </div>
              <button onClick={() => setShowSafetyModal(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs font-bold text-slate-600 leading-relaxed">
                {language === 'ar'
                  ? 'طلبك مراقب بواسطة فريق دعم الصايدي توصيل لضمان سلامتك وجودة التوصيل طوال الوقت.'
                  : 'Your delivery is continuously monitored by Al-Saidi Delivery support.'}
              </p>

              <button
                onClick={handleShareTrip}
                className="w-full py-3 px-4 rounded-full bg-[#F4F8FF] hover:bg-[#EEF5FF] font-black text-xs text-[#0B5ED7] flex items-center justify-center gap-2 border border-blue-100"
              >
                <Share2 className="w-4 h-4 text-[#0B5ED7]" />
                <span>{language === 'ar' ? 'مشاركة تفاصيل التتبع الحي' : 'Share Live Tracking Details'}</span>
              </button>

              <button
                onClick={() => safeOpenWhatsApp('967777146387', `طلب مساعدة بخصوص الطلب ${order.orderNumber}`)}
                className="w-full py-3 px-4 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center gap-2 border border-emerald-200"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>{language === 'ar' ? 'محادثة دعم الصايدي توصيل (واتساب)' : 'WhatsApp Support'}</span>
              </button>

              <button
                onClick={() => safeTriggerPhoneCall('967777146387')}
                className="w-full py-3 px-4 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-xs flex items-center justify-center gap-2 border border-rose-200"
              >
                <Phone className="w-4 h-4 text-rose-600" />
                <span>{language === 'ar' ? 'اتصال طوارئ بالدعم المباشر' : 'Emergency Call Support'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Order Chat Modal with Driver */}
      <OrderChatModal
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        orderId={order.id || order.orderNumber}
        orderNumber={order.orderNumber || order.id}
        recipientName={driverName}
        recipientPhone={driverPhone}
        currentUserType="customer"
        currentUserId={order.customerId || 'customer_user'}
      />
    </div>
  );
}
