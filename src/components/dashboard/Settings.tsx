import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
    School,
    Settings as SettingsIcon,
    Plus,
    X,
    CreditCard,
    Save,
    ChevronLeft,
    Layers,
    Calendar,
    RefreshCcw,
    AlertCircle,
    ShieldOff
} from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { useGrades } from '../../hooks/useGrades';
import { useClasses } from '../../hooks/useClasses';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function Settings() {
    const { settings, updateSettings, isUpdating } = useSettings();
    const { grades } = useGrades();
    const { classes } = useClasses();
    const [schoolName, setSchoolName] = useState(settings.school_name);
    const [stages, setStages] = useState(settings.available_stages);
    const [newStage, setNewStage] = useState('');
    const [workStartTime, setWorkStartTime] = useState(settings.work_start_time || '08:00');
    const [workEndTime, setWorkEndTime] = useState(settings.work_end_time || '14:00');

    useEffect(() => {
        setSchoolName(settings.school_name);
        setStages(settings.available_stages);
        setWorkStartTime(settings.work_start_time || '08:00');
        setWorkEndTime(settings.work_end_time || '14:00');
    }, [settings]);

    const handleSaveBasic = () => {
        updateSettings({
            school_name: schoolName,
            work_start_time: workStartTime,
            work_end_time: workEndTime
        });
    };

    const handleRequestCancel = () => {
        if (window.confirm('هل أنت متأكد من رغبتك في طلب إيقاف الاشتراك؟ سيتم إرسال طلبك للإدارة.')) {
            updateSettings({ cancel_requested: true });
            toast.info('تم إرسال طلب إيقاف الاشتراك للإدارة');
        }
    };

    const handleAddStage = () => {
        if (!newStage.trim()) return;
        if (stages.includes(newStage.trim())) {
            toast.error('هذه المرحلة موجودة بالفعل');
            return;
        }
        const updatedStages = [...stages, newStage.trim()];
        setStages(updatedStages);
        updateSettings({ available_stages: updatedStages });
        setNewStage('');
    };

    const handleRemoveStage = (stageToRemove: string) => {
        if (stages.length <= 1) {
            toast.error('يجب وجود مرحلة واحدة على الأقل');
            return;
        }

        // Check if stage is used by any Grades
        const gradesInStage = grades.filter((g: any) => g.stage === stageToRemove);
        if (gradesInStage.length > 0) {
            const totalClasses = gradesInStage.reduce((sum: number, g: any) => sum + (g.classCount || 0), 0);
            const totalStudents = gradesInStage.reduce((sum: number, g: any) => sum + (g.studentCount || 0), 0);

            toast.error(
                `⚠️ لا يمكن حذف هذه المرحلة لأنها مرتبطة بـ ${gradesInStage.length} مرحلة فرعية` +
                `${totalClasses > 0 ? ` و ${totalClasses} حلقة` : ''}` +
                `${totalStudents > 0 ? ` و ${totalStudents} طالب` : ''}`
            );
            return;
        }

        // Check if stage is used by any Classes directly (just in case)
        const classesInStage = classes.filter((c: any) => c.stage === stageToRemove);
        if (classesInStage.length > 0) {
            const totalStudents = classesInStage.reduce((sum: number, c: any) => sum + (c.currentStudents || 0), 0);
            toast.error(
                `⚠️ لا يمكن حذف هذه المرحلة لأنها مرتبطة بـ ${classesInStage.length} حلقة` +
                `${totalStudents > 0 ? ` و ${totalStudents} طالب` : ''}`
            );
            return;
        }

        const updatedStages = stages.filter((s: string) => s !== stageToRemove);
        setStages(updatedStages);
        updateSettings({ available_stages: updatedStages });
    };

    const formatDate = (dateStr: string) => {
        try {
            return format(new Date(dateStr), 'PPP', { locale: ar });
        } catch (e) {
            return dateStr;
        }
    };

    return (
        <div className="space-y-6" dir="rtl">
            <div className="flex items-center gap-3">
                <div className="bg-orange-500 p-2 rounded-lg">
                    <SettingsIcon className="h-6 w-6 text-black" />
                </div>
                <div>
                    <h2 className="text-2xl text-black">إعدادات المدرسة</h2>
                    <p className="text-gray-600">إدارة هوية المدرسة والمراحل الدراسية والاشتراك</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* School Profile */}
                <Card className="border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="border-b border-gray-50 pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <School className="h-5 w-5 text-orange-500" />
                            هوية المدرسة
                        </CardTitle>
                        <CardDescription>هذه البيانات تظهر في واجهة البرنامج والتقارير</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="school-name">اسم المدرسة / المنشأة</Label>
                            <Input
                                id="school-name"
                                value={schoolName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSchoolName(e.target.value)}
                                placeholder="أدخل اسم المدرسة"
                                className="bg-gray-50 border-gray-100 focus:bg-white transition-all"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start-time">بداية الدوام</Label>
                                <Input
                                    id="start-time"
                                    type="time"
                                    value={workStartTime}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWorkStartTime(e.target.value)}
                                    className="bg-gray-50 border-gray-100 focus:bg-white transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end-time">نهاية الدوام</Label>
                                <Input
                                    id="end-time"
                                    type="time"
                                    value={workEndTime}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWorkEndTime(e.target.value)}
                                    className="bg-gray-50 border-gray-100 focus:bg-white transition-all"
                                />
                            </div>
                        </div>
                        <Button
                            onClick={handleSaveBasic}
                            disabled={isUpdating || (schoolName === settings.school_name && workStartTime === settings.work_start_time && workEndTime === settings.work_end_time)}
                            className="bg-orange-500 hover:bg-orange-600 text-white w-full font-bold shadow-md shadow-orange-500/20"
                        >
                            <Save className="ml-2 h-4 w-4" />
                            حفظ التغييرات
                        </Button>
                    </CardContent>
                </Card>

                {/* Subscription Info */}
                <Card className="border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="border-b border-gray-50 pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <CreditCard className="h-5 w-5 text-orange-500" />
                            الاشتراك والخدمات
                        </CardTitle>
                        <CardDescription>تحكم في اشتراكك وخدماتك البريميوم</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="flex items-center justify-between p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                            <div>
                                <p className="text-xs text-orange-600 font-medium mb-1">نوع الباقة</p>
                                <p className="text-xl font-black text-orange-950">{settings.subscription_type}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <Badge className="bg-green-500 text-white hover:bg-green-600 border-none px-4 py-1">
                                    نشط
                                </Badge>
                                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    ينتهي في: {formatDate(settings.expiry_date)}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="pt-4 border-t border-gray-50">
                                {settings.cancel_requested ? (
                                    <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100 flex items-center gap-3 text-yellow-700 text-sm">
                                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                        <span>تم إرسال طلب إيقاف الاشتراك، جارِ معالجته من قبل الإدارة.</span>
                                    </div>
                                ) : (
                                    <Button
                                        onClick={handleRequestCancel}
                                        variant="outline"
                                        className="w-full text-red-500 border-red-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all text-xs"
                                    >
                                        <ShieldOff className="ml-2 h-4 w-4" />
                                        طلب إيقاف الاشتراك
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Academic Stages */}
                <Card className="lg:col-span-2 border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="border-b border-gray-50 pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Layers className="h-5 w-5 text-orange-500" />
                            المراحل الدراسية العامة
                        </CardTitle>
                        <CardDescription>قم بتعريف المراحل الأساسية (مثل: ابتدائي، حضانة، إلخ). ستظهر هذه الخيارات عند إضافة مراحل دراسية جديدة.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="flex flex-wrap gap-2 min-h-[40px]">
                            {stages.map((stage: string) => (
                                <Badge
                                    key={stage}
                                    variant="secondary"
                                    className="px-4 py-2 text-sm flex items-center gap-2 bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 transition-all font-medium rounded-full"
                                >
                                    {stage}
                                    <button
                                        onClick={() => handleRemoveStage(stage)}
                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </Badge>
                            ))}
                        </div>

                        <div className="flex items-end gap-2 max-w-md pt-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                            <div className="flex-1 space-y-2">
                                <Label className="text-xs font-bold text-gray-600 mr-1">إضافة مرحلة عامة جديدة</Label>
                                <Input
                                    value={newStage}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewStage(e.target.value)}
                                    placeholder="مثال: التمهيدي"
                                    className="bg-white border-gray-200"
                                    onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleAddStage()}
                                />
                            </div>
                            <Button
                                onClick={handleAddStage}
                                className="bg-black hover:bg-gray-800 text-white shadow-lg"
                            >
                                <Plus className="ml-2 h-4 w-4" />
                                إضافة
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
