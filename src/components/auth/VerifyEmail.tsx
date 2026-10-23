import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Mail, MessageCircle, CheckCircle, Loader2 } from 'lucide-react';
import Logo from '../brand/Logo';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "../ui/input-otp"

interface VerifyEmailProps {
  email: string;
  onVerify: () => void;
}

export default function VerifyEmail({ email: propEmail, onVerify }: VerifyEmailProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  // Priority: prop > location state > session
  const [email, setEmail] = useState(propEmail || location.state?.email);

  // Update local email state when prop changes
  useEffect(() => {
    if (propEmail) setEmail(propEmail);
  }, [propEmail]);

  // Fetch email from session if missing
  useEffect(() => {
    if (!email) {
      const getUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setEmail(user.email);
        }
      };
      getUser();
    }
  }, [email]);

  const handleResendEmail = async () => {
    if (!email) {
      toast.error('البريد الإلكتروني غير موجود. الرجاء تسجيل الدخول مرة أخرى.');
      return;
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;
      toast.success('تم إعادة إرسال رمز التحقق بنجاح');
    } catch (error: any) {
      console.error('Resend Error:', error);
      toast.error(error.message || 'فشل إرسال الرمز');
    }
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
      navigate('/dashboard');

    } catch (error: any) {
      console.error('OTP Error:', error);
      toast.error('رمز التحقق غير صحيح أو منتهي الصلاحية');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen brand-auth-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <Logo size={56} subtitle="إدارة مدارس تحفيظ القرآن" wordmarkClassName="brand-wordmark-lg" />
          </Link>
        </div>

        <Card className="border-orange-500/20">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <div className="bg-orange-500/10 p-4 rounded-full">
                <Mail className="h-12 w-12 text-orange-500" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">التحقق من البريد الإلكتروني</CardTitle>
            <CardDescription className="text-center">
              أدخل رمز التحقق المرسل إلى {email || 'بريدك الإلكتروني'}
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
                variant="ghost"
                className="w-full text-gray-500 hover:text-gray-700"
              >
                إعادة إرسال الرمز
              </Button>
            </div>

          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Link to="/login" className="text-sm text-gray-600 hover:text-orange-500 transition-colors">
              العودة لتسجيل الدخول
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
