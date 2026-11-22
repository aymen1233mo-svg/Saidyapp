import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F4F8FF] dark:bg-slate-950 p-4" dir="rtl">
      <Card className="w-full max-w-md rounded-3xl border border-blue-100 shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
        <div className="h-2 bg-gradient-to-l from-[#0B5ED7] to-[#FF6B00]" />
        <CardContent className="pt-8 pb-7 px-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#EEF5FF] border border-blue-200 flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-[#FF6B00]" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">404 - الصفحة غير موجودة</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            عذراً، الصفحة التي تبحث عنها غير متوفرة في تطبيق الصايدي توصيل.
          </p>
          <Button
            onClick={() => setLocation("/")}
            className="w-full rounded-full bg-gradient-to-l from-[#0B5ED7] to-[#003B99] hover:from-[#0a53c2] hover:to-[#002f7a] text-white font-bold h-11 gap-2 shadow-md"
          >
            <Home className="h-4 w-4" />
            العودة للرئيسية
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
