import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, Bell, Globe, Moon, Sun, Lock, CreditCard, Smartphone, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
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
import { PermissionsManager } from '@/components/PermissionsManager';

interface SettingItem {
  key: string;
  label: string;
  description: string;
  type: 'switch' | 'theme' | 'select';
  value: boolean | string;
  onChange: (value: any) => void;
  options?: Array<{ value: string; label: string }>;
}

interface SettingsGroup {
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  items: SettingItem[];
}

export default function Settings() {
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();
  const { logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [settings, setSettings] = useState({
    notifications: {
      orderUpdates: true,
      promotions: true,
      sound: true,
    },
    currency: 'YER',
    autoLocation: true,
  });

  const handleNotificationChange = (setting: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [setting]: value,
      },
    }));

    toast({
      title: language === 'ar' ? "تم حفظ الإعدادات" : "Settings Saved",
      description: language === 'ar' ? "تم تحديث إعداداتك بنجاح" : "Your settings have been updated successfully",
    });
  };

  const handleSimpleSettingChange = (setting: string, value: boolean | string) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value,
    }));

    toast({
      title: language === 'ar' ? "تم حفظ الإعدادات" : "Settings Saved",
      description: language === 'ar' ? "تم تحديث إعداداتك بنجاح" : "Your settings have been updated successfully",
    });
  };

  const settingsGroups: SettingsGroup[] = [
    {
      title: language === 'ar' ? 'الإشعارات' : 'Notifications',
      icon: Bell,
      items: [
        {
          key: 'orderUpdates',
          label: language === 'ar' ? 'تحديثات الطلبات' : 'Order Updates',
          description: language === 'ar' ? 'إشعارات حول حالة طلباتك' : 'Notifications about your order status',
          type: 'switch',
          value: settings.notifications.orderUpdates,
          onChange: (value: boolean) => handleNotificationChange('orderUpdates', value),
        },
        {
          key: 'promotions',
          label: language === 'ar' ? 'العروض والتخفيضات' : 'Offers & Promotions',
          description: language === 'ar' ? 'إشعارات حول العروض الجديدة' : 'Notifications about new discounts and offers',
          type: 'switch',
          value: settings.notifications.promotions,
          onChange: (value: boolean) => handleNotificationChange('promotions', value),
        },
        {
          key: 'sound',
          label: language === 'ar' ? 'الأصوات' : 'Sounds',
          description: language === 'ar' ? 'تشغيل أصوات الإشعارات' : 'Play notification audio',
          type: 'switch',
          value: settings.notifications.sound,
          onChange: (value: boolean) => handleNotificationChange('sound', value),
        },
      ],
    },
    {
      title: language === 'ar' ? 'العرض واللغة' : 'Display & Language',
      icon: Globe,
      items: [
        {
          key: 'theme',
          label: language === 'ar' ? 'المظهر' : 'Appearance',
          description: language === 'ar' ? 'اختيار المظهر الفاتح أو الداكن' : 'Choose light or dark appearance',
          type: 'theme',
          value: theme,
          onChange: toggleTheme,
        },
        {
          key: 'language',
          label: language === 'ar' ? 'اللغة' : 'Language',
          description: language === 'ar' ? 'اختيار لغة التطبيق' : 'Select application language',
          type: 'select',
          value: language,
          options: [
            { value: 'ar', label: 'العربية' },
            { value: 'en', label: 'English' },
          ],
          onChange: (value: 'ar' | 'en') => {
            setLanguage(value);
            toast({
              title: value === 'ar' ? "تم تغيير اللغة" : "Language Changed",
              description: value === 'ar' ? "تم تحويل التطبيق للغة العربية" : "App has been switched to English",
            });
          },
        },
        {
          key: 'currency',
          label: language === 'ar' ? 'العملة' : 'Currency',
          description: language === 'ar' ? 'وحدة العملة المستخدمة' : 'Currency unit used in app',
          type: 'select',
          value: settings.currency,
          options: [
            { value: 'YER', label: language === 'ar' ? 'الريال اليمني (YER)' : 'Yemeni Rial (YER)' },
          ],
          onChange: (value: string) => handleSimpleSettingChange('currency', value),
        },
      ],
    },
    {
      title: language === 'ar' ? 'الموقع والخصوصية' : 'Location & Privacy',
      icon: Lock,
      items: [
        {
          key: 'autoLocation',
          label: language === 'ar' ? 'تحديد الموقع تلقائياً' : 'Automatic Location',
          description: language === 'ar' ? 'السماح للتطبيق بتحديد موقعك' : 'Allow app to detect your location',
          type: 'switch',
          value: settings.autoLocation,
          onChange: (value: boolean) => handleSimpleSettingChange('autoLocation', value),
        },
      ],
    },
  ];

  const quickActions = [
    {
      icon: CreditCard,
      label: language === 'ar' ? 'طرق الدفع' : 'Payment Methods',
      description: language === 'ar' ? 'إدارة طرق الدفع المحفوظة' : 'Manage saved payment methods',
      action: () => setLocation('/payment-methods'),
      testId: 'settings-payment-methods',
    },
    {
      icon: Smartphone,
      label: language === 'ar' ? 'حول التطبيق' : 'About App',
      description: language === 'ar' ? 'معلومات النسخة والتحديثات' : 'Version info & updates',
      action: () => setLocation('/about'),
      testId: 'settings-about',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F8FF] dark:bg-slate-950 pb-24" dir={language === 'ar' ? 'rtl' : 'ltr'}>
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
              data-testid="button-settings-back"
              className="rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/20"
            >
              <ArrowRight className={`h-5 w-5 ${language === 'en' ? 'rotate-180' : ''}`} />
            </Button>
            <div>
              <h2 className="text-xl font-black tracking-tight">{t('settings')}</h2>
              <p className="text-xs text-blue-100 mt-0.5">
                {language === 'ar' ? 'تخصيص حسابك وتفضيلات الصايدي توصيل' : 'Customize your Al-Saidi Delivery preferences'}
              </p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shadow-inner">
            <SettingsIcon className="h-5 w-5 text-[#FF9B42]" />
          </div>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-4 -mt-5 relative z-20">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-full p-1.5 bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 shadow-md h-auto">
            <TabsTrigger
              value="general"
              className="rounded-full py-2.5 font-bold text-xs sm:text-sm flex items-center gap-2 data-[state=active]:bg-[#0B5ED7] data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <SettingsIcon className="h-4 w-4" />
              {language === 'ar' ? 'إعدادات عامة' : 'General Settings'}
            </TabsTrigger>
            <TabsTrigger
              value="permissions"
              className="rounded-full py-2.5 font-bold text-xs sm:text-sm flex items-center gap-2 data-[state=active]:bg-[#0B5ED7] data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              <Lock className="h-4 w-4" />
              {language === 'ar' ? 'الصلاحيات' : 'Permissions'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-5 mt-5">
            {/* Settings Groups */}
            {settingsGroups.map((group) => {
              const Icon = group.icon;
              return (
                <Card key={group.title} className="rounded-3xl border border-blue-100/90 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                  <CardHeader className="pb-2 border-b border-blue-50 dark:border-slate-800 bg-[#EEF5FF]/50 dark:bg-slate-800/40">
                    <CardTitle className="flex items-center gap-3 text-base font-extrabold text-slate-900 dark:text-white">
                      <div className="w-9 h-9 rounded-xl bg-[#0B5ED7] text-white flex items-center justify-center shadow-xs">
                        <Icon className="h-4 w-4" />
                      </div>
                      {group.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4">
                    {group.items.map((item) => (
                      <div key={item.key} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-b-0 last:pb-0">
                        <div className="flex-1">
                          <Label
                            htmlFor={item.key}
                            className="text-slate-900 dark:text-white font-bold cursor-pointer"
                            data-testid={`setting-label-${item.key}`}
                          >
                            {item.label}
                          </Label>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {item.description}
                          </p>
                        </div>

                        <div className="ms-4">
                          {item.type === 'switch' && (
                            <Switch
                              id={item.key}
                              checked={item.value as boolean}
                              onCheckedChange={item.onChange}
                              className="data-[state=checked]:bg-[#0B5ED7]"
                              data-testid={`switch-${item.key}`}
                            />
                          )}

                          {item.type === 'theme' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={item.onChange}
                              className="rounded-full border-blue-200 text-[#0B5ED7] hover:bg-[#EEF5FF] font-bold"
                              data-testid="button-toggle-theme"
                            >
                              {theme === 'dark' ? (
                                <Sun className="h-4 w-4 ml-2 text-[#FF6B00]" />
                              ) : (
                                <Moon className="h-4 w-4 ml-2 text-[#0B5ED7]" />
                              )}
                              {theme === 'dark' ? (language === 'ar' ? 'فاتح' : 'Light') : (language === 'ar' ? 'داكن' : 'Dark')}
                            </Button>
                          )}

                          {item.type === 'select' && item.options && (
                            <Select
                              value={item.value as string}
                              onValueChange={item.onChange}
                            >
                              <SelectTrigger className="w-40 rounded-full border-blue-200 bg-[#F4F8FF] dark:bg-slate-800 font-semibold text-xs" data-testid={`select-${item.key}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {item.options.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}

            {/* Quick Actions */}
            <Card className="rounded-3xl border border-blue-100/90 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
              <CardHeader className="pb-2 border-b border-blue-50 dark:border-slate-800">
                <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white">
                  {language === 'ar' ? 'إعدادات إضافية' : 'Additional Settings'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-4">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.testId}
                      variant="ghost"
                      className="w-full h-auto p-3.5 rounded-2xl justify-between bg-[#F4F8FF]/70 dark:bg-slate-800/60 hover:bg-[#EEF5FF] dark:hover:bg-slate-800 border border-blue-100/80 dark:border-slate-700"
                      onClick={action.action}
                      data-testid={action.testId}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 text-[#0B5ED7] border border-blue-100 dark:border-slate-700 flex items-center justify-center shadow-2xs">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                          <div className="font-bold text-slate-900 dark:text-white text-sm">{action.label}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{action.description}</div>
                        </div>
                      </div>
                      <ArrowRight className={`h-5 w-5 text-[#FF6B00] ${language === 'ar' ? 'rotate-180' : ''}`} />
                    </Button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Sign Out */}
            <Button
              variant="destructive"
              className="w-full font-black h-12 rounded-full text-base gap-2 mt-2 shadow-md shadow-rose-500/15"
              data-testid="button-sign-out"
              onClick={() => setShowLogoutConfirm(true)}
            >
              <LogOut className="w-5 h-5" />
              {t('logout')}
            </Button>
          </TabsContent>

          <TabsContent value="permissions" className="mt-5">
            <PermissionsManager onPermissionUpdate={(permission, granted) => {
              console.log(`Permission ${permission} ${granted ? 'granted' : 'denied'}`);
              toast({
                title: granted ? (language === 'ar' ? 'تم منح الإذن' : 'Permission Granted') : (language === 'ar' ? 'تم رفض الإذن' : 'Permission Denied'),
                description: `${permission}: ${granted ? (language === 'ar' ? 'مُمنوح' : 'Granted') : (language === 'ar' ? 'مرفوض' : 'Denied')}`,
                variant: granted ? 'default' : 'destructive',
              });
            }} />
          </TabsContent>
        </Tabs>
      </section>

      {/* نافذة تأكيد الخروج المنبثقة */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent className="rounded-3xl max-w-md border-blue-100">
          <AlertDialogHeader>
            <AlertDialogTitle className={`${language === 'ar' ? 'text-right' : 'text-left'} text-lg font-black text-red-600 flex items-center gap-2`}>
              <LogOut className="w-5 h-5" />
              {t('logout_confirm_title')}
            </AlertDialogTitle>
            <AlertDialogDescription className={`${language === 'ar' ? 'text-right' : 'text-left'} text-sm font-semibold text-gray-700 py-3 leading-relaxed`}>
              {t('logout_confirm_desc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex items-center gap-2 justify-end">
            <AlertDialogCancel className="font-bold rounded-full">{t('cancel')}</AlertDialogCancel>
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
              className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-full"
            >
              {t('logout')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}