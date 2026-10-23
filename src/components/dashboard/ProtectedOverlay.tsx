import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Mail, MessageCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '../../lib/supabase';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "../ui/input-otp"

interface ProtectedOverlayProps {
  email: string;
  onVerify: () => void;
}

export default function ProtectedOverlay({ email, onVerify }: ProtectedOverlayProps) {
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");

  const handleResendEmail = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;
      toast.success('تم إعادة إرسال رمز التحقق بنجاح');
    } catch (error: any) {
      toast.error(error.message || 'فشل إرسال الرمز');
    }
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(`مرحباً، أحتاج مساعدة في تفعيل حسابي: ${email}`);
    window.open(`https://wa.me/966501234567?text=${message}`, '_blank');
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      toast.error('الرجاء إدخال رمز التحقق كاملاً');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup'
      });

      if (error) throw error;

      // Verify successful
      onVerify(); // Update app state
      toast.success('تم تفعيل حسابك بنجاح!');

    } catch (error: any) {
      console.error('OTP Error:', error);
      toast.error('رمز التحقق غير صحيح أو منتهي الصلاحية');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-orange-500/20 shadow-2xl">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="bg-orange-500/10 p-4 rounded-full">
              <AlertCircle className="h-12 w-12 text-orange-500" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center text-black">
            يرجى تفعيل حسابك
          </CardTitle>
          <CardDescription className="text-center">
            أدخل رمز التحقق المرسل إلى {email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          <div className="flex flex-col items-center gap-4 py-4" dir="ltr">
            <span className="text-sm text-gray-500 mb-2 font-medium">الرمز المكون من 8 أرقام</span>
            <InputOTP
              maxLength={8}
              value={otp}
              onChange={(value) => setOtp(value)}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="w-10 h-10 text-lg border border-black rounded-md mr-1" />
                <InputOTPSlot index={1} className="w-10 h-10 text-lg border border-black rounded-md mr-1" />
                <InputOTPSlot index={2} className="w-10 h-10 text-lg border border-black rounded-md mr-1" />
                <InputOTPSlot index={3} className="w-10 h-10 text-lg border border-black rounded-md" />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={4} className="w-10 h-10 text-lg border border-black rounded-md mr-1" />
                <InputOTPSlot index={5} className="w-10 h-10 text-lg border border-black rounded-md mr-1" />
                <InputOTPSlot index={6} className="w-10 h-10 text-lg border border-black rounded-md mr-1" />
                <InputOTPSlot index={7} className="w-10 h-10 text-lg border border-black rounded-md" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleVerifyOtp}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              disabled={loading || otp.length < 6}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              تفعيل الحساب
            </Button>

            <Button
              onClick={handleResendEmail}
              variant="outline"
              className="w-full border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
            >
              <Mail className="ml-2 h-4 w-4" />
              إعادة إرسال رمز التفعيل
            </Button>

            <Button
              onClick={handleWhatsApp}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <MessageCircle className="ml-2 h-4 w-4" />
              تواصل عبر واتساب للمساعدة
            </Button>

            <Button
              onClick={() => window.location.reload()}
              variant="ghost"
              className="w-full text-gray-500 hover:text-gray-700"
            >
              تحديث الصفحة
            </Button>
          </div>

          <div className="text-center text-sm text-gray-600">
            <p className="mb-1">لم تستلم الرمز؟</p>
            <p>تحقق من مجلد الرسائل غير المرغوب فيها (Spam)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
