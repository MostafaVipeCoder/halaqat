import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Mail, Lock } from 'lucide-react';
import Logo from '../brand/Logo';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';

interface LoginProps {
  onLogin?: (email: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.email || !formData.password) {
        toast.error('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      if (onLogin && data.user?.email) {
        onLogin(data.user.email);
      }

      toast.success('تم تسجيل الدخول بنجاح!');
      // Navigation is handled by App.tsx redirect based on auth state, 
      // but we can explicitly go to dashboard if needed, or verify-email if unverified.
      // App.tsx logic: if authenticated -> dashboard. 
      // Let's navigate to dashboard/root to trigger the redirect check.
      navigate('/dashboard');

    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'فشل في تسجيل الدخول. تأكد من صحة البيانات.');
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
            <CardTitle className="text-2xl text-center">تسجيل الدخول</CardTitle>
            <CardDescription className="text-center">
              أدخل بريدك الإلكتروني وكلمة المرور للدخول إلى حسابك
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pr-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pr-10"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Link
                  to="/forget-password"
                  className="text-sm text-orange-500 hover:text-orange-600 transition-colors"
                >
                  نسيت كلمة المرور؟
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                disabled={loading}
              >
                {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-sm text-gray-600">
              ليس لديك حساب؟{' '}
              <Link to="/register" className="text-orange-500 hover:text-orange-600 transition-colors">
                سجل الآن
              </Link>
            </div>
            <div className="text-center">
              <Link to="/" className="text-sm text-gray-600 hover:text-orange-500 transition-colors">
                العودة للصفحة الرئيسية
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div >
  );
}
