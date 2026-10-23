import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Plus, Edit, Trash2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'sonner';

interface Package {
    id: string;
    name: string;
    price: number;
    description: string;
    student_limit: number | null;
}

export default function AdminPackages() {
    const [packages, setPackages] = useState<Package[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPackage, setCurrentPackage] = useState<Partial<Package>>({});

    useEffect(() => {
        fetchPackages();
    }, []);

    const fetchPackages = async () => {
        const { data } = await supabase.from('subscription_packages').select('*').order('price', { ascending: true });
        if (data) setPackages(data);
        setIsLoading(false);
    };

    const handleSave = async () => {
        if (!currentPackage.name || !currentPackage.price) {
            toast.error('الرجاء إدخال الاسم والسعر');
            return;
        }

        // Check for duplicate package name
        const duplicateCheck = packages.find(pkg =>
            pkg.name.trim().toLowerCase() === currentPackage.name?.trim().toLowerCase() &&
            pkg.id !== currentPackage.id
        );

        if (duplicateCheck) {
            toast.error('يوجد باقة بنفس الاسم بالفعل');
            return;
        }

        const { error } = await supabase
            .from('subscription_packages')
            .upsert(currentPackage)
            .select();

        if (error) {
            toast.error('حدث خطأ أثناء الحفظ');
        } else {
            toast.success('تم حفظ الباقة بنجاح');
            fetchPackages();
            setIsEditing(false);
            setCurrentPackage({});
        }
    };

    const handleDelete = async (pkg: Package) => {
        // Check if package is in use
        const { count } = await supabase
            .from('school_settings')
            .select('*', { count: 'exact', head: true })
            .eq('subscription_type', pkg.name);

        if (count && count > 0) {
            toast.error(`لا يمكن حذف هذه الباقة لأنها مستخدمة من قبل ${count} مدرسة`);
            return;
        }

        const { error } = await supabase
            .from('subscription_packages')
            .delete()
            .eq('id', pkg.id);

        if (error) {
            toast.error('حدث خطأ أثناء الحذف');
        } else {
            toast.success('تم حذف الباقة بنجاح');
            fetchPackages();
        }
    };

    return (
        <div className="space-y-6 text-right" dir="rtl">
            <div className="flex justify-between items-center">
                <Button onClick={() => { setIsEditing(true); setCurrentPackage({}); }} className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Plus className="ml-2 h-4 w-4" />
                    إضافة باقة جديدة
                </Button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">الباقات والأسعار</h2>
                    <p className="text-gray-500 text-sm">إدارة خطط الاشتراك المتاحة للمدارس</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {packages.map((pkg) => (
                    <Card key={pkg.id} className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <Badge className="bg-orange-50 text-orange-600 border-orange-200">نشط</Badge>
                                <CardTitle className="text-xl font-bold text-gray-900">{pkg.name}</CardTitle>
                            </div>
                            <CardDescription className="text-gray-500">{pkg.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-4">
                            <div className="text-3xl font-bold text-orange-500">
                                {pkg.price} <span className="text-sm text-gray-400 font-normal">جنية / شهرياً</span>
                            </div>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    حد الطلاب: <span className="font-semibold text-gray-900">{pkg.student_limit || 'غير محدود'}</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    دعم فني متواصل
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    تحديثات النظام الدورية
                                </li>
                            </ul>
                            <div className="flex gap-2 pt-4">
                                <Button variant="outline" className="flex-1 border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900" onClick={() => { setCurrentPackage(pkg); setIsEditing(true); }}>
                                    <Edit className="ml-2 h-4 w-4" />
                                    تعديل
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                    onClick={() => handleDelete(pkg)}
                                >
                                    <Trash2 className="ml-2 h-4 w-4" />
                                    حذف
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <Card className="w-full max-w-md bg-white border-gray-200 shadow-xl">
                        <CardHeader>
                            <CardTitle className="text-gray-900">{currentPackage.id ? 'تعديل باقة' : 'إضافة باقة جديدة'}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-gray-700">اسم الباقة</Label>
                                <Input
                                    value={currentPackage.name || ''}
                                    onChange={e => setCurrentPackage({ ...currentPackage, name: e.target.value })}
                                    className="bg-white border-gray-300 text-gray-900 focus-visible:ring-orange-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700">السعر شهرياً</Label>
                                <Input
                                    type="number"
                                    value={currentPackage.price || ''}
                                    onChange={e => setCurrentPackage({ ...currentPackage, price: parseFloat(e.target.value) })}
                                    className="bg-white border-gray-300 text-gray-900 focus-visible:ring-orange-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700">حد الطلاب (اتركه فارغاً لغير المحدود)</Label>
                                <Input
                                    type="number"
                                    value={currentPackage.student_limit || ''}
                                    onChange={e => setCurrentPackage({ ...currentPackage, student_limit: parseInt(e.target.value) || null })}
                                    className="bg-white border-gray-300 text-gray-900 focus-visible:ring-orange-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700">الوصف</Label>
                                <Input
                                    value={currentPackage.description || ''}
                                    onChange={e => setCurrentPackage({ ...currentPackage, description: e.target.value })}
                                    className="bg-white border-gray-300 text-gray-900 focus-visible:ring-orange-500"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button onClick={handleSave} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">حفظ</Button>
                                <Button onClick={() => setIsEditing(false)} variant="ghost" className="flex-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100">إلغاء</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

function Badge({ children, className }: { children: React.ReactNode, className: string }) {
    return <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${className}`}>{children}</span>;
}
