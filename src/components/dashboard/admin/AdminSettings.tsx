import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Textarea } from '../../ui/textarea';
import { adminService } from '../../../services/adminService';
import { toast } from 'sonner';
import {
    Settings,
    ShieldAlert,
    Bell,
    Mail,
    Phone,
    Save,
    RefreshCcw,
    Globe,
    Lock
} from 'lucide-react';

export default function AdminSettings() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState<any>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setIsLoading(true);
        try {
            const data = await adminService.getPlatformSettings();
            setSettings(data);
        } catch (error) {
            toast.error('حدث خطأ أثناء تحميل الإعدادات');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        setIsSaving(true);
        try {
            await adminService.updatePlatformSettings(settings);
            toast.success('تم حفظ الإعدادات بنجاح');
        } catch (error) {
            toast.error('حدث خطأ أثناء حفظ الإعدادات');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCcw className="h-8 w-8 text-orange-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">إعدادات النظام</h2>
                    <p className="text-gray-500">تحكم في المعايير العالمية للمنصة</p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold gap-2"
                >
                    {isSaving ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    حفظ التغييرات
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Platform Status */}
                <Card className="border-orange-500/10">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-orange-500" />
                            <CardTitle>حالة المنصة</CardTitle>
                        </div>
                        <CardDescription>إدارة توفر النظام للمستخدمين</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-100">
                            <div className="space-y-0.5">
                                <Label className="text-orange-900 font-bold">وضع الصيانة</Label>
                                <p className="text-xs text-orange-700">عند التفعيل، سيتم إيقاف الدخول للمديرين والطلاب</p>
                            </div>
                            <Switch
                                checked={settings?.maintenance_mode}
                                onCheckedChange={(val) => setSettings({ ...settings, maintenance_mode: val })}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Global Announcement */}
                <Card className="border-orange-500/10">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Bell className="h-5 w-5 text-orange-500" />
                            <CardTitle>إعلان عام</CardTitle>
                        </div>
                        <CardDescription>سيظهر هذا النص في شريط علوي لجميع المستخدمين</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>رسالة الإعلان</Label>
                            <Textarea
                                placeholder="اكتب نص الإعلان هنا..."
                                value={settings?.announcement_message || ''}
                                onChange={(e) => setSettings({ ...settings, announcement_message: e.target.value })}
                                className="min-h-[100px] bg-gray-50 border-gray-200 focus:border-orange-500"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Support Contact */}
                <Card className="border-orange-500/10">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-orange-500" />
                            <CardTitle>بيانات التواصل والدعم</CardTitle>
                        </div>
                        <CardDescription>المعلومات التي تظهر للمدارس عند حاجتها للمساعدة</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-gray-400" />
                                بريد الدعم الفني
                            </Label>
                            <Input
                                type="email"
                                value={settings?.system_email || ''}
                                onChange={(e) => setSettings({ ...settings, system_email: e.target.value })}
                                className="bg-gray-50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-gray-400" />
                                رقم واتساب الدعم
                            </Label>
                            <Input
                                type="text"
                                value={settings?.support_phone || ''}
                                onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
                                className="bg-gray-50"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Security (Placeholder) */}
                <Card className="bg-gray-50 border-dashed border-2 border-gray-200">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Lock className="h-5 w-5 text-gray-400" />
                            <CardTitle className="text-gray-400">إعدادات الأمان المتقدمة</CardTitle>
                        </div>
                        <CardDescription>هذه الخيارات تحت التطوير</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center p-6 text-center">
                            <p className="text-sm text-gray-500 italic">
                                سيتم إضافة خيارات مثل التحقق بخطوتين وتغيير كلمة مرور الإدارة قريباً.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
