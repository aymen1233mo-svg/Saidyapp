import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, MessageCircle, MapPin, Clock, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { makePhoneCall } from './PermissionsManager';
import { OrderChatModal } from './OrderChatModal';

interface Driver {
  id: string;
  name: string;
  phone: string;
  currentLocation?: string;
  isAvailable: boolean;
}

interface DriverCommunicationProps {
  driver: Driver;
  orderId?: string;
  orderNumber: string;
  customerLocation?: string;
}

export function DriverCommunication({ driver, orderId, orderNumber, customerLocation }: DriverCommunicationProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const customerId = user?.phone || user?.id || localStorage.getItem('customer_phone') || 'customer_user';

  const handlePhoneCall = () => {
    try {
      makePhoneCall(driver.phone);
      toast({
        title: 'جاري الاتصال',
        description: `جاري الاتصال بالمندوب ${driver.name}`,
      });
    } catch (error) {
      toast({
        title: 'خطأ في الاتصال',
        description: 'لا يمكن إجراء المكالمة الآن',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Card className="border border-blue-100 rounded-3xl shadow-sm bg-white overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#F4F8FF] to-white border-b border-blue-50 pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2 text-[#003B99]">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0B5ED7] flex items-center justify-center">
                <User className="h-4 w-4" />
              </div>
              <span>معلومات المندوب</span>
            </div>
            <Badge className={driver.isAvailable ? "bg-emerald-100 text-emerald-700 border-emerald-200 rounded-full" : "bg-gray-100 text-gray-600 rounded-full"}>
              {driver.isAvailable ? 'متاح الآن' : 'غير متاح'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2.5 bg-[#F8FAFF] p-3.5 rounded-2xl border border-blue-50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">اسم المندوب:</span>
              <span className="font-bold text-gray-900">{driver.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">رقم الهاتف:</span>
              <span className="font-bold text-[#0B5ED7]" dir="ltr">{driver.phone}</span>
            </div>
            {driver.currentLocation && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">الموقع الحالي:</span>
                <span className="font-semibold text-gray-800 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-[#FF6B00]" />
                  {driver.currentLocation}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Button
              onClick={handlePhoneCall}
              className="flex items-center gap-2 rounded-full bg-[#0B5ED7] hover:bg-[#094db5] text-white font-bold shadow-sm"
              data-testid="call-driver-button"
            >
              <Phone className="h-4 w-4" />
              اتصال
            </Button>

            <Button
              variant="outline"
              onClick={() => setChatOpen(true)}
              className="flex items-center gap-2 rounded-full border-[#0B5ED7] text-[#0B5ED7] hover:bg-blue-50 font-bold"
              data-testid="chat-driver-button"
            >
              <MessageCircle className="h-4 w-4" />
              مراسلة
            </Button>
          </div>

          {customerLocation && (
            <div className="bg-[#F4F8FF] p-3 rounded-2xl border border-blue-100">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-4 w-4 text-[#0B5ED7]" />
                <span className="text-xs font-bold text-[#003B99]">عنوان التوصيل:</span>
              </div>
              <p className="text-xs text-gray-600">{customerLocation}</p>
            </div>
          )}

          <div className="bg-blue-50/80 border border-blue-100 p-3 rounded-2xl text-center">
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-4 w-4 text-[#FF6B00]" />
              <span className="text-xs font-semibold text-gray-600">رقم الطلب:</span>
              <span className="font-black text-[#0B5ED7]">#{orderNumber}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <OrderChatModal
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        orderId={orderId || orderNumber}
        orderNumber={orderNumber}
        recipientName={driver.name}
        recipientPhone={driver.phone}
        currentUserType="customer"
        currentUserId={customerId}
      />
    </>
  );
}

export function useDriverCommunication() {
  const { toast } = useToast();
  const callDriver = (driverPhone: string, driverName: string) => {
    try {
      makePhoneCall(driverPhone);
      toast({
        title: 'جاري الاتصال',
        description: `جاري الاتصال بالمندوب ${driverName}`,
      });
    } catch (error) {
      toast({
        title: 'خطأ في الاتصال',
        description: 'لا يمكن إجراء المكالمة الآن',
        variant: 'destructive',
      });
    }
  };

  const messageDriver = (_driverPhone: string, driverName: string, _orderNumber: string, _message: string) => {
    toast({
      title: 'مراسلة فورية عبر النظام',
      description: `تم فتح محادثة النظام مع المندوب ${driverName}`,
    });
  };

  return { callDriver, messageDriver };
}
