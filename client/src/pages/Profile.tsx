import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, User, Phone, Mail, MapPin, Settings, Shield, Star, Clock, Receipt, MessageCircle, Share2, Loader2, AtSign, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
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
import type { User as UserType, UiSettings } from '@shared/schema';
import ShareAppModal from '@/components/ShareAppModal';

export default function Profile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const { user: currentUser, isAuthenticated, loading: authLoading, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation('/auth');
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const userId = currentUser?.id;

  const { data: uiSettings } = useQuery<UiSettings[]>({
    queryKey: ['/api/admin/ui-settings'],
  });
  
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    username: '',
    email: '',
    address: '',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const fetchCurrentLocationAddress = async () => {
    if (!navigator.geolocation) {
      toast({ 
        title: language === 'ar' ? "الموقع غير مدعوم" : "Location Not Supported", 
        description: language === 'ar' ? "متصفحك لا يدعم الوصول لموقعك الجغرافي" : "Browser does not support geolocation", 
        variant: "destructive" 
      });
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=${language}`,
            { headers: { 'User-Agent': 'AlSaidiDelivery/1.0' } }
          );
          const data = await response.json();
          if (data && data.display_name) {
            const parts = data.display_name.split(',');
            const shortAddr = parts.slice(0, 4).join('،').trim();
            setProfile(prev => ({ ...prev, address: shortAddr }));
            toast({ 
              title: language === 'ar' ? "تم تحديث العنوان النصي" : "Address Updated", 
              description: shortAddr 
            });
          } else {
            const coordsText = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
            setProfile(prev => ({ ...prev, address: coordsText }));
            toast({ 
              title: language === 'ar' ? "تم تحديد موقعك الإحداثي" : "Location Coordinates Found", 
              description: coordsText 
            });
          }
        } catch {
          const coordsText = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          setProfile(prev => ({ ...prev, address: coordsText }));
          toast({ 
            title: language === 'ar' ? "تم جلب موقعك الإحداثي" : "Coordinates Fetched", 
            description: language === 'ar' ? "يرجى تعديل التفاصيل إن لزم الأمر" : "Please adjust details if needed" 
          });
        } finally {
          setGettingLocation(false);
        }
      },
      () => {
        setGettingLocation(false);
        toast({
          title: language === 'ar' ? "تعذر الوصول للموقع" : "Location Access Denied",
          description: language === 'ar' ? "يرجى السماح بالوصول لموقعك الجغرافي في المتصفح لجلب العنوان تلقائياً" : "Please allow location access in your browser",
          variant: "destructive"
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/users', userId],
    enabled: !!userId && isAuthenticated,
    retry: false,
  });

  const { data: userOrders = [] } = useQuery({
    queryKey: ['/api/orders/customer', profile.phone],
    enabled: !!profile.phone,
    queryFn: async () => {
      const response = await fetch(`/api/orders/customer/${profile.phone}`);
      if (!response.ok) return [];
      return response.json();
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: Partial<UserType>) => {
      if (!userId) throw new Error(language === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please login first');
      const response = await apiRequest('PUT', `/api/users/${userId}`, profileData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId] });
      setIsEditing(false);
      toast({
        title: language === 'ar' ? "تم حفظ البيانات" : "Profile Saved",
        description: language === 'ar' ? "تم تحديث معلومات الملف الشخصي بنجاح" : "Your profile has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: language === 'ar' ? "خطأ في الحفظ" : "Save Error",
        description: language === 'ar' ? "حدث خطأ أثناء تحديث البيانات. يرجى المحاولة مرة أخرى." : "An error occurred while updating profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (user) {
      setProfile({
        username: (user as UserType).username || '',
        name: (user as UserType).name || '',
        phone: (user as UserType).phone || '',
        email: (user as UserType).email || '',
        address: (user as UserType).address || '',
      });
    }
  }, [user]);

  const handleSave = () => {
    updateProfileMutation.mutate({
      username: profile.username,
      name: profile.name,
      phone: profile.phone,
      email: profile.email,
      address: profile.address,
    } as any);
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F4F8FF]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B5ED7] mx-auto mb-4"></div>
          <p className="text-slate-600 font-bold">{t('loading')}</p>
        </div>
      </div>
    );
  }

  const getSetting = (key: string, defaultValue: string = '') => {
    return uiSettings?.find(s => s.key === key)?.value || defaultValue;
  };

  const supportWhatsapp = getSetting('support_whatsapp', '');
  const supportPhone = getSetting('support_phone', '');
  const shareUrl = getSetting('share_url', '');
  const shareText = getSetting('share_text', 'الصايدي توصيل');

  const profileStats = [
    { 
      icon: Receipt, 
      label: language === 'ar' ? 'إجمالي الطلبات' : 'Total Orders', 
      value: userOrders?.length?.toString() || '0', 
      color: 'text-[#0B5ED7]' 
    },
    { icon: Star, label: language === 'ar' ? 'التقييم' : 'Rating', value: '4.9', color: 'text-[#FF6B00]' },
    { 
      icon: Clock, 
      label: language === 'ar' ? 'عضو منذ' : 'Member Since', 
      value: (user as any)?.createdAt ? new Date((user as any).createdAt).toLocaleDateString(language === 'ar' ? 'ar-YE' : 'en-US', { month: 'short', year: 'numeric' }) : (language === 'ar' ? 'جديد' : 'New'), 
      color: 'text-emerald-600' 
    },
  ];

  const menuItems = [
    { icon: Receipt, label: t('my_orders'), path: '/orders', description: language === 'ar' ? 'عرض تاريخ الطلبات' : 'View your order history', testId: 'profile-orders' },
    { icon: MapPin, label: t('saved_addresses'), path: '/addresses', description: language === 'ar' ? 'إدارة عناوين التوصيل' : 'Manage delivery addresses', testId: 'profile-addresses' },
    { icon: Settings, label: t('settings'), path: '/settings', description: language === 'ar' ? 'إعدادات التطبيق والحساب' : 'App & account settings', testId: 'profile-settings' },
    ...(supportWhatsapp ? [{
      icon: MessageCircle,
      label: language === 'ar' ? 'دعم واتساب' : 'WhatsApp Support',
      path: '#',
      description: language === 'ar' ? 'تواصل معنا عبر واتساب' : 'Chat with our support',
      testId: 'profile-whatsapp',
      onClick: () => { window.open(`https://wa.me/${supportWhatsapp.replace(/\D/g, '')}`, '_blank'); }
    }] : []),
    ...(supportPhone ? [{
      icon: Phone,
      label: language === 'ar' ? 'اتصل بنا' : 'Call Us',
      path: '#',
      description: language === 'ar' ? 'اتصل برقم الدعم المباشر' : 'Direct phone support',
      testId: 'profile-call',
      onClick: () => { window.open(`tel:${supportPhone}`, '_blank'); }
    }] : []),
    {
      icon: Share2,
      label: language === 'ar' ? 'مشاركة التطبيق' : 'Share App',
      path: '#',
      description: language === 'ar' ? 'شارك التطبيق مع أصدقائك' : 'Share with friends',
      testId: 'profile-share',
      onClick: async () => {
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
          try {
            await navigator.share({
              title: getSetting('app_name', 'الصايدي توصيل'),
              text: shareText || (language === 'ar' ? 'اطلب من الصايدي توصيل الآن!' : 'Order from Al-Saidi Delivery now!'),
              url: shareUrl || window.location.origin
            });
            return;
          } catch (err: any) {
            if (err?.name === 'AbortError') return;
            console.warn('Native share failed, showing modal', err);
          }
        }
        setShareModalOpen(true);
      }
    },
    { icon: Shield, label: language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy', path: '/privacy', description: language === 'ar' ? 'سياسة الخصوصية وشروط الاستخدام' : 'Privacy terms & conditions', testId: 'profile-privacy' },
  ];

  return (
    <div className="min-h-screen bg-[#F4F8FF] pb-24">
      {/* Al-Saidi Profile Hero Banner */}
      <div className="relative bg-gradient-to-br from-[#0B5ED7] via-[#0950BA] to-[#003B99] text-white pt-5 pb-10 px-4 rounded-b-[2.5rem] shadow-lg overflow-hidden">
        <div className="absolute -bottom-1 left-0 right-0 h-2.5 bg-gradient-to-r from-[#FF6B00] via-[#FF8533] to-[#FF6B00]" />
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
          <img src="/assets/saidi-logo.png" alt="الصايدي توصيل" className="h-12 object-contain mb-2 drop-shadow-md" />
          <p className="text-xs font-bold text-blue-100">
            {language === 'ar' ? 'الملف الشخصي وإعدادات الحساب' : 'Profile & Account Settings'}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-5 max-w-4xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <Card className="rounded-3xl border border-blue-100/80 shadow-[0_8px_28px_rgba(11,94,215,0.08)] overflow-hidden bg-white">
              <CardHeader className="text-center bg-[#F4F8FF]/70 pb-6 border-b border-blue-100/60">
                <div className="w-20 h-20 bg-gradient-to-br from-[#0B5ED7] to-[#003B99] rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-blue-600/20 text-white border-2 border-white">
                  <User className="h-10 w-10 text-white" />
                </div>
                <CardTitle className="text-lg font-black text-slate-900">
                  {profile.name || (!isAuthenticated ? (language === 'ar' ? 'مستخدم ضيف' : 'Guest') : (language === 'ar' ? 'المستخدم' : 'User'))}
                </CardTitle>
                <Badge variant={!isAuthenticated ? "outline" : "secondary"} className="mx-auto mt-1 font-black text-xs bg-[#EEF5FF] text-[#0B5ED7] border-blue-200 rounded-full px-3">
                  {!isAuthenticated ? (language === 'ar' ? 'مستخدم ضيف' : 'Guest') : (language === 'ar' ? 'عضو مميز' : 'Premium Member')}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-slate-800 font-black text-xs">
                        {language === 'ar' ? '1. اسم العميل' : '1. Full Name'}
                      </Label>
                      <Input
                        id="name"
                        value={profile.name}
                        onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                        placeholder={language === 'ar' ? "أدخل اسمك الكامل" : "Enter your full name"}
                        className="mt-1 rounded-2xl border-blue-100 bg-[#F4F8FF] focus:bg-white focus:border-[#0B5ED7]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-slate-800 font-black text-xs">
                        {language === 'ar' ? '2. رقم الهاتف' : '2. Phone Number'}
                      </Label>
                      <Input
                        id="phone"
                        value={profile.phone}
                        onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder={language === 'ar' ? "أدخل رقم الهاتف" : "Enter phone number"}
                        dir="ltr"
                        className="mt-1 rounded-2xl border-blue-100 bg-[#F4F8FF] focus:bg-white focus:border-[#0B5ED7]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="username" className="text-slate-800 font-black text-xs">
                        {language === 'ar' ? '3. اسم المستخدم' : '3. Username'}
                      </Label>
                      <Input
                        id="username"
                        value={profile.username}
                        onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value }))}
                        placeholder={language === 'ar' ? "أدخل اسم المستخدم" : "Enter username"}
                        className="mt-1 rounded-2xl border-blue-100 bg-[#F4F8FF] focus:bg-white focus:border-[#0B5ED7]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-slate-800 font-black text-xs">
                        {language === 'ar' ? '4. البريد الإلكتروني (إن وجد)' : '4. Email (optional)'}
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="example@mail.com"
                        className="mt-1 rounded-2xl border-blue-100 bg-[#F4F8FF] focus:bg-white focus:border-[#0B5ED7]"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label htmlFor="address" className="text-slate-800 font-black text-xs">
                          {language === 'ar' ? '5. عنوان موقع العميل' : '5. Location Address'}
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={fetchCurrentLocationAddress}
                          disabled={gettingLocation}
                          className="text-xs text-[#0B5ED7] hover:bg-[#EEF5FF] h-7 px-2 font-black rounded-full"
                        >
                          {gettingLocation ? (
                            <><Loader2 className="h-3 w-3 animate-spin mx-1" /> {language === 'ar' ? 'جاري التحديد...' : 'Locating...'}</>
                          ) : (
                            <><MapPin className="h-3 w-3 mx-1" /> {language === 'ar' ? 'استخدام موقعي الحالي' : 'Use Current Location'}</>
                          )}
                        </Button>
                      </div>
                      <Input
                        id="address"
                        value={profile.address}
                        onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                        placeholder={language === 'ar' ? "أدخل عنوان موقعك أو انقر على استخدام موقعي الحالي" : "Enter address or fetch current location"}
                        className="rounded-2xl border-blue-100 bg-[#F4F8FF] focus:bg-white focus:border-[#0B5ED7]"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleSave} className="flex-1 font-black rounded-full bg-[#FF6B00] hover:bg-[#E55E00] text-white shadow-sm" disabled={updateProfileMutation.isPending}>
                        {updateProfileMutation.isPending ? t('loading') : t('save')}
                      </Button>
                      <Button variant="outline" className="rounded-full font-black border-blue-200 text-[#0B5ED7]" onClick={() => setIsEditing(false)}>{t('cancel')}</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3.5 bg-[#F4F8FF] rounded-2xl border border-blue-100/70">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-[#0B5ED7] shrink-0" />
                        <div>
                          <p className="text-[11px] text-slate-400 font-bold">
                            {language === 'ar' ? '1. اسم العميل' : '1. Customer Name'}
                          </p>
                          <p className="font-black text-slate-900 text-sm">{profile.name || profile.username || (language === 'ar' ? 'غير محدد' : 'Not specified')}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-[#F4F8FF] rounded-2xl border border-blue-100/70">
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-[#0B5ED7] shrink-0" />
                        <div>
                          <p className="text-[11px] text-slate-400 font-bold">
                            {language === 'ar' ? '2. رقم الهاتف' : '2. Phone Number'}
                          </p>
                          <p className="font-black text-slate-900 text-sm" dir="ltr">{profile.phone || (language === 'ar' ? 'غير محدد' : 'Not specified')}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-[#F4F8FF] rounded-2xl border border-blue-100/70">
                      <div className="flex items-center gap-3">
                        <AtSign className="h-5 w-5 text-slate-400 shrink-0" />
                        <div>
                          <p className="text-[11px] text-slate-400 font-bold">
                            {language === 'ar' ? '3. اسم المستخدم' : '3. Username'}
                          </p>
                          <p className="font-black text-slate-800 text-sm">{profile.username || (language === 'ar' ? 'غير محدد' : 'Not specified')}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-[#F4F8FF] rounded-2xl border border-blue-100/70">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-slate-400 shrink-0" />
                        <div>
                          <p className="text-[11px] text-slate-400 font-bold">
                            {language === 'ar' ? '4. البريد الإلكتروني' : '4. Email'}
                          </p>
                          <p className="font-black text-slate-800 text-sm">
                            {profile.email ? profile.email : <span className="text-slate-400 text-xs italic">{language === 'ar' ? 'لا يوجد بريد إلكتروني' : 'No email provided'}</span>}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-[#F4F8FF] rounded-2xl border border-blue-100/70 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <MapPin className="h-5 w-5 text-[#0B5ED7] shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[11px] text-slate-400 font-bold">
                              {language === 'ar' ? '5. عنوان موقع العميل (نصي)' : '5. Location Address (Text)'}
                            </p>
                            <p className="font-black text-slate-900 text-sm truncate">{profile.address || (language === 'ar' ? 'لم يتم تحديث الموقع بعد' : 'No address set')}</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={fetchCurrentLocationAddress}
                          disabled={gettingLocation}
                          className="text-xs gap-1 border-blue-200 text-[#0B5ED7] hover:bg-[#EEF5FF] rounded-full shrink-0 font-black"
                        >
                          {gettingLocation ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {language === 'ar' ? 'جاري الجلب...' : 'Locating...'}</>
                          ) : (
                            <><MapPin className="h-3.5 w-3.5" /> {language === 'ar' ? 'جلب موقعي' : 'Get Location'}</>
                          )}
                        </Button>
                      </div>
                    </div>

                    <Button onClick={() => setIsEditing(true)} className="w-full font-black mt-2 rounded-full bg-[#0B5ED7] hover:bg-[#0950BA] text-white shadow-md shadow-blue-600/20 h-12">
                      {t('edit_profile')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-3 gap-3">
              {profileStats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card key={index} className="text-center rounded-3xl border border-blue-100/80 shadow-xs bg-white overflow-hidden">
                    <CardContent className="p-4">
                      <div className="w-10 h-10 rounded-2xl bg-[#EEF5FF] border border-blue-100 flex items-center justify-center mx-auto mb-2">
                        <Icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                      <div className="text-base font-black text-slate-900">{stat.value}</div>
                      <div className="text-[11px] font-bold text-slate-400">{stat.label}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="space-y-2.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.path + item.label}
                    variant="ghost"
                    className="w-full h-auto p-4 justify-between bg-white hover:bg-[#EEF5FF] rounded-3xl border border-blue-100/80 shadow-xs transition-all"
                    onClick={() => item.onClick ? item.onClick() : setLocation(item.path)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#EEF5FF] flex items-center justify-center text-[#0B5ED7]">
                        <Icon className="h-5 w-5 text-[#0B5ED7]" />
                      </div>
                      <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                        <div className="font-black text-slate-900 text-sm">{item.label}</div>
                        <div className="text-xs text-slate-400 font-bold">{item.description}</div>
                      </div>
                    </div>
                    <ArrowRight className={`h-4 w-4 text-[#0B5ED7] ${language === 'ar' ? 'rotate-180' : ''}`} />
                  </Button>
                );
              })}

              <Button
                variant="outline"
                className="w-full h-auto p-4 justify-between rounded-3xl border-rose-200 bg-white text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold transition-all mt-4"
                onClick={() => setShowLogoutConfirm(true)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                    <LogOut className="h-5 w-5 text-rose-600" />
                  </div>
                  <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                    <div className="font-black text-rose-600">{t('logout')}</div>
                    <div className="text-xs text-rose-400">{language === 'ar' ? 'الخروج ومسح الجلسة الحالية' : 'Exit and clear session'}</div>
                  </div>
                </div>
                <ArrowRight className={`h-5 w-5 text-rose-400 ${language === 'ar' ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent className="rounded-3xl max-w-md border border-blue-100">
          <AlertDialogHeader>
            <AlertDialogTitle className={`${language === 'ar' ? 'text-right' : 'text-left'} text-lg font-black text-rose-600 flex items-center gap-2`}>
              <LogOut className="w-5 h-5" />
              {t('logout_confirm_title')}
            </AlertDialogTitle>
            <AlertDialogDescription className={`${language === 'ar' ? 'text-right' : 'text-left'} text-sm font-semibold text-slate-700 py-3 leading-relaxed`}>
              {t('logout_confirm_desc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex items-center gap-2 justify-end">
            <AlertDialogCancel className="font-bold rounded-full border-blue-200 text-[#0B5ED7]">{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowLogoutConfirm(false);
                logout();
                toast({
                  title: t('logout'),
                  description: language === 'ar' ? "تم تسجيل الخروج وتفريغ البيانات المتعلقة بالحساب بنجاح" : "Successfully logged out",
                });
                setLocation('/auth');
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-black rounded-full"
            >
              {t('logout')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ShareAppModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        appName={getSetting('app_name', 'الصايدي توصيل')}
        shareText={shareText || (language === 'ar' ? 'اطلب من الصايدي توصيل الآن!' : 'Order from Al-Saidi Delivery now!')}
        shareUrl={shareUrl || window.location.origin}
        logoUrl={getSetting('header_logo_url') || getSetting('logo_url')}
      />
    </div>
  );
}
