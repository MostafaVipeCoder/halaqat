import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '../../ui/table';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import {
    adminService
} from '../../../services/adminService';
import type {
    SchoolOverview
} from '../../../types';
import {
    Search,
    Package,
    Percent,
    ExternalLink,
    ShieldAlert,
    ShieldCheck,
    MoreVertical
} from 'lucide-react';
import { Input } from '../../ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '../../ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../ui/select';
import { Label } from '../../ui/label';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../../ui/alert-dialog';
import { toast } from 'sonner';

export default function AdminCustomers() {
    const [customers, setCustomers] = useState<SchoolOverview[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Dialog states
    const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);
    const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
    const [selectedSchool, setSelectedSchool] = useState<SchoolOverview | null>(null);
    const [availablePackages, setAvailablePackages] = useState<any[]>([]);
    const [newPackage, setNewPackage] = useState('');

    const [discountValue, setDiscountValue] = useState(10);
    const [discountExpiry, setDiscountExpiry] = useState(30);

    // Confirmation states
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{
        type: 'package' | 'discount' | 'status',
        data?: any
    } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [schools, pkgs] = await Promise.all([
                adminService.getAllSchools(),
                adminService.getAvailablePackages()
            ]);
            setCustomers(schools);
            setAvailablePackages(pkgs);
        } finally {
            setIsLoading(false);
        }
    };

    const filtered = customers.filter(c =>
        c.school_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.owner_email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleChangePackage = async () => {
        if (!selectedSchool || !newPackage) return;
        setConfirmAction({ type: 'package' });
        setIsConfirmDialogOpen(true);
    };

    const confirmPackageChange = async () => {
        if (!selectedSchool || !newPackage) return;
        try {
            await adminService.updateSubscription(selectedSchool.school_id, newPackage);
            toast.success('تم تحديث الباقة بنجاح');
            setIsPackageDialogOpen(false);
            setIsConfirmDialogOpen(false);
            loadData();
        } catch (error) {
            toast.error('حدث خطأ أثناء تحديث الباقة');
        }
    };

    const handleApplyDiscount = async () => {
        if (!selectedSchool) return;
        setConfirmAction({ type: 'discount' });
        setIsConfirmDialogOpen(true);
    };

    const confirmDiscountApply = async () => {
        if (!selectedSchool) return;
        try {
            await adminService.applyDiscount(selectedSchool.school_id, discountValue, discountExpiry);
            toast.success('تم إضافة الخصم بنجاح');
            setIsDiscountDialogOpen(false);
            setIsConfirmDialogOpen(false);
            loadData();
        } catch (error) {
            toast.error('حدث خطأ أثناء إضافة الخصم');
        }
    };

    const handleToggleStatus = async (school: SchoolOverview) => {
        setSelectedSchool(school);
        setConfirmAction({ type: 'status', data: school });
        setIsConfirmDialogOpen(true);
    };

    const confirmToggleStatus = async () => {
        if (!selectedSchool || !confirmAction?.data) return;
        const school = confirmAction.data as SchoolOverview;
        const newStatus = school.status === 'active' ? 'suspended' : 'active';
        try {
            await adminService.toggleSchoolStatus(school.school_id, newStatus);
            toast.success(newStatus === 'active' ? 'تم تفعيل الحساب' : 'تم تعليق الحساب');
            setIsConfirmDialogOpen(false);
            loadData();
        } catch (error) {
            toast.error('حدث خطأ أثناء تغيير حالة الحساب');
        }
    };

    return (
        <div className="space-y-6 text-right" dir="rtl">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">إدارة العملاء</h2>
                <p className="text-gray-500 text-sm">عرض وإدارة الحسابات المسجلة في النظام</p>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="بحث باسم المدرسة أو الإيميل..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pr-10 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-orange-500"
                    />
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50">
                        <TableRow className="border-gray-200 hover:bg-transparent">
                            <TableHead className="text-right text-gray-500 font-semibold">المدرسة</TableHead>
                            <TableHead className="text-right text-gray-500 font-semibold">المالك</TableHead>
                            <TableHead className="text-right text-gray-500 font-semibold">الباقة</TableHead>
                            <TableHead className="text-right text-gray-500 font-semibold">الطلاب</TableHead>
                            <TableHead className="text-right text-gray-500 font-semibold">تاريخ التسجيل</TableHead>
                            <TableHead className="text-right text-gray-500 font-semibold">الإجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-10 text-gray-500">جاري التحميل...</TableCell></TableRow>
                        ) : filtered.length > 0 ? (
                            filtered.map((school) => (
                                <TableRow key={school.id} className="border-gray-100 hover:bg-gray-50/50">
                                    <TableCell className="font-medium text-gray-900">{school.school_name}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-gray-900">{school.owner_name}</span>
                                            <span className="text-xs text-gray-500">{school.owner_email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="border-orange-500/20 text-orange-600 bg-orange-50">
                                            {school.subscription_type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-gray-700">{school.student_count}</TableCell>
                                    <TableCell className="text-xs text-gray-500">
                                        {new Date(school.created_at).toLocaleDateString('ar-EG')}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={school.status === 'active'
                                                ? "border-green-500/20 text-green-600 bg-green-50"
                                                : "border-red-500/20 text-red-600 bg-red-50"
                                            }
                                        >
                                            {school.status === 'active' ? 'نشط' : 'معلق'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="تغيير الباقة"
                                                className="hover:bg-blue-50 text-gray-400 hover:text-blue-600"
                                                onClick={() => {
                                                    setSelectedSchool(school);
                                                    setNewPackage(school.subscription_type);
                                                    setIsPackageDialogOpen(true);
                                                }}
                                            >
                                                <Package className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="إضافة خصم"
                                                className="hover:bg-green-50 text-gray-400 hover:text-green-600"
                                                onClick={() => {
                                                    setSelectedSchool(school);
                                                    setIsDiscountDialogOpen(true);
                                                }}
                                            >
                                                <Percent className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title={school.status === 'active' ? "تعليق الحساب" : "تفعيل الحساب"}
                                                className={school.status === 'active'
                                                    ? "hover:bg-red-50 text-gray-400 hover:text-red-600"
                                                    : "hover:bg-green-50 text-gray-400 hover:text-green-600"
                                                }
                                                onClick={() => handleToggleStatus(school)}
                                            >
                                                {school.status === 'active' ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={6} className="text-center py-10 text-gray-500">لا يوجد عملاء مطابقين للبحث</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Change Package Dialog */}
            <Dialog open={isPackageDialogOpen} onOpenChange={setIsPackageDialogOpen}>
                <DialogContent className="bg-white border-gray-200">
                    <DialogHeader>
                        <DialogTitle className="text-right">تغيير باقة الاشتراك - {selectedSchool?.school_name}</DialogTitle>
                        <DialogDescription className="text-right">
                            اختر باقة جديدة للمدرسة سيتم تطبيق التغيير فوراً.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4" dir="rtl">
                        <div className="space-y-2">
                            <Label>اختر الباقة الجديدة</Label>
                            <Select value={newPackage} onValueChange={setNewPackage}>
                                <SelectTrigger className="bg-white border-gray-200 text-gray-900">
                                    <SelectValue placeholder="اختر الباقة" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-gray-200">
                                    {availablePackages.map(pkg => (
                                        <SelectItem key={pkg.id} value={pkg.name}>
                                            {pkg.name} - {pkg.price} ج.م
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setIsPackageDialogOpen(false)}>إلغاء</Button>
                        <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleChangePackage}>تحديث الباقة</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Apply Discount Dialog */}
            <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
                <DialogContent className="bg-white border-gray-200">
                    <DialogHeader>
                        <DialogTitle className="text-right">إضافة خصم - {selectedSchool?.school_name}</DialogTitle>
                        <DialogDescription className="text-right">
                            حدد نسبة الخصم ومدة صلاحيته بالايام.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4" dir="rtl">
                        <div className="space-y-2">
                            <Label>نسبة الخصم (%)</Label>
                            <Input
                                type="number"
                                value={discountValue}
                                onChange={e => setDiscountValue(parseInt(e.target.value))}
                                className="bg-white border-gray-200 text-gray-900"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>مدة الخصم (بالأيام)</Label>
                            <Input
                                type="number"
                                value={discountExpiry}
                                onChange={e => setDiscountExpiry(parseInt(e.target.value))}
                                className="bg-white border-gray-200 text-gray-900"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setIsDiscountDialogOpen(false)}>إلغاء</Button>
                        <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleApplyDiscount}>تطبيق الخصم</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirmation AlertDialog */}
            <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
                <AlertDialogContent className="bg-white border-gray-200" dir="rtl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-right">
                            {confirmAction?.type === 'package' && 'تأكيد تغيير الباقة'}
                            {confirmAction?.type === 'discount' && 'تأكيد إضافة الخصم'}
                            {confirmAction?.type === 'status' && (confirmAction.data?.status === 'active' ? 'تأكيد تعليق الحساب' : 'تأكيد تفعيل الحساب')}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-right">
                            {confirmAction?.type === 'package' && `هل أنت متأكد من تغيير باقة مدرسة ${selectedSchool?.school_name} إلى ${newPackage}؟`}
                            {confirmAction?.type === 'discount' && `هل أنت متأكد من إضافة خصم بقيمة ${discountValue}% لمدرسة ${selectedSchool?.school_name} لمدة ${discountExpiry} يوماً؟`}
                            {confirmAction?.type === 'status' && (confirmAction.data?.status === 'active'
                                ? `هل أنت متأكد من تعليق حساب مدرسة ${selectedSchool?.school_name}؟ لن يتمكن منسوبو المدرسة من الدخول للنظام.`
                                : `هل أنت متأكد من تفعيل حساب مدرسة ${selectedSchool?.school_name}؟`
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200">إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                            className={confirmAction?.type === 'status' && confirmAction.data?.status === 'active'
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : "bg-orange-500 hover:bg-orange-600 text-white"
                            }
                            onClick={() => {
                                if (confirmAction?.type === 'package') confirmPackageChange();
                                if (confirmAction?.type === 'discount') confirmDiscountApply();
                                if (confirmAction?.type === 'status') confirmToggleStatus();
                            }}
                        >
                            تأكيد التنفيذ
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
