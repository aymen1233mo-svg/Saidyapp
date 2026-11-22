import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Plus, Edit, Trash2, Home, Briefcase, ArrowRight, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface UserAddress {
  id: string;
  userId: string;
  type: string;
  title: string;
  address: string;
  details?: string;
  latitude?: string;
  longitude?: string;
  isDefault: boolean;
  createdAt: Date;
}

interface CustomerAddressesProps {
  userId?: string;
}

export default function CustomerAddresses({ userId: propUserId }: CustomerAddressesProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const effectiveUserId =
    propUserId ||
    user?.id ||
    user?.phone ||
    localStorage.getItem('customer_id') ||
    localStorage.getItem('customer_phone') ||
    localStorage.getItem('user_id') ||
    '';

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [formData, setFormData] = useState({
    type: 'home',
    title: '',
    address: '',
    details: '',
    latitude: '',
    longitude: '',
    isDefault: false
  });

  const { data: addresses = [], isLoading } = useQuery<UserAddress[]>({
    queryKey: ['/api/customer/addresses', effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) {
        try {
          const cached = localStorage.getItem('local_saved_addresses');
          return cached ? JSON.parse(cached) : [];
        } catch (_) {
          return [];
        }
      }
      const response = await fetch(`/api/customer/addresses?userId=${encodeURIComponent(effectiveUserId)}`);
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: true
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!effectiveUserId) {
        const newLocal: UserAddress = {
          id: 'local_' + Date.now(),
          userId: 'guest',
          type: data.type || 'home',
          title: data.title,
          address: data.address,
          details: data.details,
          isDefault: data.isDefault || false,
          createdAt: new Date()
        };
        const current = JSON.parse(localStorage.getItem('local_saved_addresses') || '[]');
        localStorage.setItem('local_saved_addresses', JSON.stringify([newLocal, ...current]));
        return newLocal;
      }
      const response = await fetch('/api/customer/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId: effectiveUserId })
      });
      if (!response.ok) throw new Error('Failed to create address');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer/addresses'] });
      toast({ title: 'تم إضافة العنوان بنجاح' });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: 'خطأ في إضافة العنوان', variant: 'destructive' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      if (id.startsWith('local_')) {
        const current: UserAddress[] = JSON.parse(localStorage.getItem('local_saved_addresses') || '[]');
        const updated = current.map(a => a.id === id ? { ...a, ...data } : a);
        localStorage.setItem('local_saved_addresses', JSON.stringify(updated));
        return { success: true };
      }
      const response = await fetch(`/api/customer/addresses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId: effectiveUserId })
      });
      if (!response.ok) throw new Error('Failed to update address');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer/addresses'] });
      toast({ title: 'تم تحديث العنوان بنجاح' });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: 'خطأ في تحديث العنوان', variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (id.startsWith('local_')) {
        const current: UserAddress[] = JSON.parse(localStorage.getItem('local_saved_addresses') || '[]');
        const filtered = current.filter(a => a.id !== id);
        localStorage.setItem('local_saved_addresses', JSON.stringify(filtered));
        return;
      }
      const response = await fetch(`/api/customer/addresses/${id}?userId=${encodeURIComponent(effectiveUserId)}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete address');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer/addresses'] });
      toast({ title: 'تم حذف العنوان بنجاح' });
    },
    onError: () => {
      toast({ title: 'خطأ في حذف العنوان', variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData({
      type: 'home',
      title: '',
      address: '',
      details: '',
      latitude: '',
      longitude: '',
      isDefault: false
    });
    setEditingAddress(null);
  };

  const handleOpenDialog = (address?: UserAddress) => {
    if (address) {
      setEditingAddress(address);
      setFormData({
        type: address.type || 'home',
        title: address.title || '',
        address: address.address || '',
        details: address.details || '',
        latitude: address.latitude || '',
        longitude: address.longitude || '',
        isDefault: address.isDefault || false
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      userId: effectiveUserId
    };

    if (editingAddress) {
      updateMutation.mutate({ id: editingAddress.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getAddressIcon = (type: string) => {
    switch (type) {
      case 'home': return <Home className="h-5 w-5" />;
      case 'work': return <Briefcase className="h-5 w-5" />;
      default: return <MapPin className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F8FF] pb-24" dir="rtl">
      {/* Al-Saidi Curved Header */}
      <div className="relative bg-gradient-to-br from-[#0B5ED7] via-[#0950BA] to-[#003B99] text-white sticky top-0 z-20 rounded-b-[2.25rem] shadow-lg overflow-hidden">
        <div className="absolute -bottom-1 left-0 right-0 h-2.5 bg-gradient-to-r from-[#FF6B00] via-[#FF8533] to-[#FF6B00]" />
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  setLocation('/track-orders');
                }
              }}
              className="rounded-full bg-white/15 hover:bg-white/25 text-white"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-black text-white">عناويني المحفوظة</h1>
              <p className="text-xs text-blue-100 font-semibold">عناوين التوصيل لحسابك</p>
            </div>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            size="sm"
            className="gap-1.5 rounded-full bg-[#FF6B00] hover:bg-[#E55E00] text-white font-black px-4 shadow-md"
          >
            <Plus className="h-4 w-4" />
            إضافة عنوان
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {!effectiveUserId && (
          <div className="bg-[#EEF5FF] border border-blue-200 rounded-3xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white text-[#0B5ED7] flex items-center justify-center shrink-0">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">حفظ العناوين الدائم</p>
                <p className="text-[11px] text-slate-600 font-medium">سجل الدخول لربط عناوينك بحسابك ومزامنتها على كل أجهزتك</p>
              </div>
            </div>
            <Button size="sm" onClick={() => setLocation('/auth')} className="shrink-0 text-xs rounded-full bg-[#0B5ED7] hover:bg-[#0950BA] text-white font-black">
              تسجيل الدخول
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-16 text-slate-500 font-bold">جاري جلب عناوينك المحفوظة...</div>
        ) : addresses.length === 0 ? (
          <Card className="border-dashed border-2 border-blue-200 rounded-3xl bg-white">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-3xl bg-[#EEF5FF] text-[#0B5ED7] flex items-center justify-center mx-auto mb-3">
                <MapPin className="h-8 w-8" />
              </div>
              <h3 className="font-black text-slate-900 text-lg mb-1">لا توجد عناوين محفوظة بعد</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-5">
                أضف عناوينك المفضلة (المنزل، العمل) لتسهيل وتسريع توصيل طلباتك
              </p>
              <Button onClick={() => handleOpenDialog()} className="rounded-full px-7 bg-[#FF6B00] hover:bg-[#E55E00] text-white font-black">
                <Plus className="h-4 w-4 ml-2" />
                إضافة أول عنوان
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {addresses.map((addr) => (
              <Card key={addr.id} className={`rounded-3xl transition-all shadow-xs bg-white ${addr.isDefault ? 'border-2 border-[#0B5ED7] bg-[#EEF5FF]/40' : 'border border-blue-100/80 hover:border-blue-300'}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex gap-3 flex-1 min-w-0">
                      <div className={`p-3 rounded-2xl shrink-0 ${addr.isDefault ? 'bg-[#0B5ED7] text-white' : 'bg-[#F4F8FF] text-[#0B5ED7]'}`}>
                        {getAddressIcon(addr.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-black text-slate-900 text-base">{addr.title}</h3>
                          {addr.isDefault && (
                            <Badge className="bg-[#0B5ED7] text-white text-[10px] px-2.5 py-0.5 rounded-full font-black">افتراضي</Badge>
                          )}
                          <span className="text-[10px] font-bold text-slate-500 bg-[#F4F8FF] px-2.5 py-0.5 rounded-full">
                            {addr.type === 'home' ? 'منزل' : addr.type === 'work' ? 'عمل' : 'آخر'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 font-medium leading-relaxed">{addr.address}</p>
                        {addr.details && (
                          <p className="text-xs text-slate-500 mt-1.5 bg-[#F4F8FF] p-2.5 rounded-xl border border-blue-100">{addr.details}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-[#EEF5FF]" onClick={() => handleOpenDialog(addr)}>
                        <Edit className="h-4 w-4 text-[#0B5ED7]" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-rose-50" onClick={() => deleteMutation.mutate(addr.id)}>
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md w-[92vw] rounded-3xl p-6 border border-blue-100" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-xl font-black text-slate-900">
              {editingAddress ? 'تعديل العنوان' : 'إضافة عنوان توصيل جديد'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-bold text-slate-700">نوع العنوان</Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {[
                  { value: 'home', label: 'منزل', icon: Home },
                  { value: 'work', label: 'عمل', icon: Briefcase },
                  { value: 'other', label: 'أخرى', icon: MapPin }
                ].map((type) => (
                  <Button
                    key={type.value}
                    type="button"
                    variant={formData.type === type.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData({ ...formData, type: type.value })}
                    className={`gap-1.5 rounded-full h-10 font-bold text-xs ${
                      formData.type === type.value
                        ? 'bg-[#0B5ED7] hover:bg-[#0950BA] text-white'
                        : 'border-blue-100 text-slate-700 hover:bg-[#EEF5FF]'
                    }`}
                  >
                    <type.icon className="h-3.5 w-3.5" />
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="title" className="text-xs font-bold text-slate-700">اسم العنوان (مختصر)</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="مثال: منزلي، العمل، شقة الوالد"
                required
                className="mt-1 rounded-2xl border-blue-100 bg-[#F4F8FF] focus:bg-white focus:border-[#0B5ED7]"
              />
            </div>

            <div>
              <Label htmlFor="address" className="text-xs font-bold text-slate-700">العنوان الكامل (الشارع والحي)</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="مثال: عدن، كريتر، شارع الساحة"
                required
                rows={3}
                className="mt-1 rounded-2xl border-blue-100 bg-[#F4F8FF] focus:bg-white focus:border-[#0B5ED7] resize-none"
              />
            </div>

            <div>
              <Label htmlFor="details" className="text-xs font-bold text-slate-700">تفاصيل إضافية أو علامة مميزة (اختياري)</Label>
              <Input
                id="details"
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                placeholder="مثال: عمارة النور، الطابق الثالث، شقة 5"
                className="mt-1 rounded-2xl border-blue-100 bg-[#F4F8FF] focus:bg-white focus:border-[#0B5ED7]"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="w-4 h-4 text-[#0B5ED7] rounded accent-[#0B5ED7] cursor-pointer"
              />
              <Label htmlFor="isDefault" className="text-xs font-bold text-slate-700 cursor-pointer">تعيين كعنوان افتراضي للتوصيل</Label>
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-full border-blue-200 text-[#0B5ED7]">
                إلغاء
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="rounded-full bg-[#FF6B00] hover:bg-[#E55E00] text-white font-black">
                {createMutation.isPending || updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ العنوان'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
