import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, MapPin, Plus, Target, Home, Building, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface SavedAddress {
  id: string;
  type: 'home' | 'work' | 'other';
  label: string;
  address: string;
  details: string;
  isDefault: boolean;
}

export default function Location() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    type: 'home' as 'home' | 'work' | 'other',
    label: '',
    address: '',
    details: '',
  });

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([
    {
      id: '1',
      type: 'home',
      label: 'المنزل',
      address: 'صنعاء، شارع الزبيري',
      details: 'بجانب مسجد النور، الطابق الثاني',
      isDefault: true,
    },
    {
      id: '2',
      type: 'work',
      label: 'العمل',
      address: 'صنعاء، شارع السبعين',
      details: 'مجمع الأعمال، مكتب رقم 205',
      isDefault: false,
    },
  ]);

  const handleAddAddress = () => {
    if (!newAddress.label || !newAddress.address) {
      toast({
        title: "معلومات ناقصة",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    const address: SavedAddress = {
      id: Date.now().toString(),
      ...newAddress,
      isDefault: savedAddresses.length === 0,
    };

    setSavedAddresses(prev => [...prev, address]);
    setNewAddress({ type: 'home', label: '', address: '', details: '' });
    setShowAddForm(false);

    toast({
      title: "تم إضافة العنوان",
      description: "تم حفظ العنوان الجديد بنجاح",
    });
  };

  const handleSetDefault = (id: string) => {
    setSavedAddresses(prev =>
      prev.map(addr => ({ ...addr, isDefault: addr.id === id }))
    );
    toast({
      title: "تم تحديث العنوان الافتراضي",
      description: "تم تعيين العنوان كافتراضي للتوصيل",
    });
  };

  const handleDeleteAddress = (id: string) => {
    setSavedAddresses(prev => prev.filter(addr => addr.id !== id));
    toast({
      title: "تم حذف العنوان",
      description: "تم حذف العنوان من القائمة المحفوظة",
    });
  };

  const getAddressIcon = (type: string) => {
    switch (type) {
      case 'home': return Home;
      case 'work': return Building;
      default: return MapPin;
    }
  };

  const getAddressColor = (type: string) => {
    switch (type) {
      case 'home': return 'bg-[#EEF5FF] text-[#0B5ED7] border-blue-200';
      case 'work': return 'bg-orange-50 text-[#FF6B00] border-orange-200';
      default: return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F8FF] dark:bg-slate-950 pb-24" dir="rtl">
      {/* Curved Al-Saidi Royal Blue Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#0B5ED7] via-[#0046B8] to-[#00338D] text-white px-4 pt-5 pb-10 rounded-b-[32px] shadow-lg border-b-4 border-[#FF6B00]">
        <div className="absolute -left-10 -top-10 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute right-0 bottom-0 w-32 h-32 rounded-full bg-[#FF6B00]/20 blur-2xl pointer-events-none" />

        <div className="max-w-3xl mx-auto relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/profile')}
              data-testid="button-location-back"
              className="rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/20"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-xl font-black tracking-tight">العناوين المحفوظة</h2>
              <p className="text-xs text-blue-100 mt-0.5">إدارة مواقع التوصيل الخاصة بك في الصايدي توصيل</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shadow-inner">
            <MapPin className="h-5 w-5 text-[#FF9B42]" />
          </div>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-4 -mt-5 relative z-20 space-y-5">
        {/* Current Location Card */}
        <Card className="rounded-3xl border border-blue-100/90 dark:border-slate-800 shadow-md bg-white dark:bg-slate-900 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3 mb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#EEF5FF] text-[#0B5ED7] flex items-center justify-center shrink-0">
                  <Target className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">موقعك الحالي</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">تم تحديده تلقائياً للتوصيل السريع</p>
                </div>
              </div>
              <Badge className="bg-[#EEF5FF] text-[#0B5ED7] hover:bg-[#EEF5FF] border border-blue-200 rounded-full px-3 py-1 text-xs font-bold">
                نشط
              </Badge>
            </div>

            <div className="bg-[#F4F8FF] dark:bg-slate-800/80 border border-blue-100 dark:border-slate-700 p-3.5 rounded-2xl">
              <p className="text-slate-800 dark:text-slate-100 font-semibold text-sm flex items-center gap-2" data-testid="current-location">
                <MapPin className="h-4 w-4 text-[#FF6B00] shrink-0" />
                صنعاء، شارع الستين، قرب دوار الأمم المتحدة
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => setLocation('/addresses')}
              className="w-full mt-3.5 h-11 rounded-full border-[#0B5ED7]/30 text-[#0B5ED7] hover:bg-[#EEF5FF] font-bold"
              data-testid="button-use-current-location"
            >
              استخدام الموقع الحالي
            </Button>
          </CardContent>
        </Card>

        {/* Add New Address Card */}
        <Card className="rounded-3xl border border-blue-100/90 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#FF6B00] flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white">
                  إضافة عنوان جديد
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAddForm(!showAddForm)}
                data-testid="button-toggle-add-form"
                className="rounded-full bg-[#EEF5FF] text-[#0B5ED7] hover:bg-[#0B5ED7] hover:text-white transition-colors"
              >
                <Plus className={`h-5 w-5 transition-transform ${showAddForm ? 'rotate-45' : ''}`} />
              </Button>
            </div>
          </CardHeader>

          {showAddForm && (
            <CardContent className="space-y-4 pt-1 pb-5">
              <div>
                <Label className="text-slate-800 dark:text-slate-200 font-bold text-xs">نوع العنوان</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[
                    { value: 'home', label: 'المنزل', icon: Home },
                    { value: 'work', label: 'العمل', icon: Building },
                    { value: 'other', label: 'أخرى', icon: MapPin },
                  ].map((type) => {
                    const Icon = type.icon;
                    const active = newAddress.type === type.value;
                    return (
                      <Button
                        key={type.value}
                        type="button"
                        variant={active ? 'default' : 'outline'}
                        className={`rounded-2xl gap-1.5 font-bold text-xs h-10 ${
                          active
                            ? 'bg-[#0B5ED7] hover:bg-[#0046B8] text-white border-[#0B5ED7]'
                            : 'border-blue-100 text-slate-700 hover:bg-[#EEF5FF]'
                        }`}
                        onClick={() => setNewAddress(prev => ({ ...prev, type: type.value as any }))}
                        data-testid={`address-type-${type.value}`}
                      >
                        <Icon className="h-4 w-4" />
                        {type.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label htmlFor="address-label" className="text-slate-800 dark:text-slate-200 font-bold text-xs">تسمية العنوان</Label>
                <Input
                  id="address-label"
                  value={newAddress.label}
                  onChange={(e) => setNewAddress(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="مثال: المنزل، العمل، بيت الأهل"
                  className="mt-1.5 rounded-2xl border-blue-100 bg-[#F4F8FF]/60 focus-visible:ring-[#0B5ED7]"
                  data-testid="input-address-label"
                />
              </div>

              <div>
                <Label htmlFor="address-street" className="text-slate-800 dark:text-slate-200 font-bold text-xs">العنوان الرئيسي *</Label>
                <Input
                  id="address-street"
                  value={newAddress.address}
                  onChange={(e) => setNewAddress(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="الشارع والحي"
                  className="mt-1.5 rounded-2xl border-blue-100 bg-[#F4F8FF]/60 focus-visible:ring-[#0B5ED7]"
                  data-testid="input-address-street"
                />
              </div>

              <div>
                <Label htmlFor="address-details" className="text-slate-800 dark:text-slate-200 font-bold text-xs">تفاصيل إضافية</Label>
                <Input
                  id="address-details"
                  value={newAddress.details}
                  onChange={(e) => setNewAddress(prev => ({ ...prev, details: e.target.value }))}
                  placeholder="رقم الطابق، معالم قريبة، ملاحظات للسائق"
                  className="mt-1.5 rounded-2xl border-blue-100 bg-[#F4F8FF]/60 focus-visible:ring-[#0B5ED7]"
                  data-testid="input-address-details"
                />
              </div>

              <div className="flex gap-2.5 pt-1">
                <Button
                  onClick={handleAddAddress}
                  className="flex-1 h-11 rounded-full bg-gradient-to-l from-[#FF6B00] to-[#FF8533] hover:from-[#e55f00] hover:to-[#ff771c] text-white font-bold shadow-md shadow-orange-500/20"
                  data-testid="button-save-address"
                >
                  حفظ العنوان
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                  className="h-11 rounded-full border-slate-200 px-5 font-bold"
                  data-testid="button-cancel-add"
                >
                  إلغاء
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Saved Addresses List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base font-black text-slate-900 dark:text-white">العناوين المحفوظة</h3>
            <span className="text-xs font-bold text-[#0B5ED7] bg-[#EEF5FF] px-3 py-1 rounded-full">
              {savedAddresses.length} عناوين
            </span>
          </div>

          {savedAddresses.map((address) => {
            const Icon = getAddressIcon(address.type);
            const iconBoxStyle = getAddressColor(address.type);

            return (
              <Card
                key={address.id}
                className={`rounded-3xl bg-white dark:bg-slate-900 shadow-sm transition-all ${
                  address.isDefault
                    ? 'border-2 border-[#0B5ED7] shadow-md shadow-blue-500/10'
                    : 'border border-blue-100/90 dark:border-slate-800'
                }`}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 flex-1">
                      <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${iconBoxStyle}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-extrabold text-slate-900 dark:text-white" data-testid={`address-label-${address.id}`}>
                            {address.label}
                          </h4>
                          {address.isDefault && (
                            <Badge className="bg-[#0B5ED7] hover:bg-[#0B5ED7] text-white rounded-full text-[11px] font-bold px-2.5">
                              افتراضي
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1" data-testid={`address-street-${address.id}`}>
                          {address.address}
                        </p>
                        {address.details && (
                          <p className="text-xs text-slate-500 dark:text-slate-400" data-testid={`address-details-${address.id}`}>
                            {address.details}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-blue-50 dark:border-slate-800">
                    <Button
                      size="sm"
                      className="flex-1 rounded-full bg-[#0B5ED7] hover:bg-[#0046B8] text-white font-bold text-xs h-9"
                      onClick={() => setLocation('/cart')}
                      data-testid={`button-deliver-here-${address.id}`}
                    >
                      التوصيل هنا
                    </Button>
                    {!address.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full border-blue-200 text-[#0B5ED7] hover:bg-[#EEF5FF] font-bold text-xs h-9"
                        onClick={() => handleSetDefault(address.id)}
                        data-testid={`button-set-default-${address.id}`}
                      >
                        تعيين كافتراضي
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteAddress(address.id)}
                      className="rounded-full border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs h-9"
                      data-testid={`button-delete-address-${address.id}`}
                    >
                      حذف
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}