import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Calendar, History, CreditCard, GraduationCap, Printer, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useStudents } from '../../hooks/useStudents';
import { useAttendance } from '../../hooks/useAttendance';
import { useClasses } from '../../hooks/useClasses';
import { usePayments } from '../../hooks/usePayments';
import { supabase } from '../../lib/supabase';
import { Student, Attendance, Class, Payment } from '../../types';
import { useSuspensions } from '../../hooks/useSuspensions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { attendanceService } from '../../services/attendanceService';

// New Components
import StudentProfileHeader from './StudentProfileHeader';
import QuickActionsToolbar from './QuickActionsToolbar';
import AttendanceTab from './AttendanceTab';
import PaymentsTab from './PaymentsTab';
import SuspensionsTab from './SuspensionsTab';
import MemorizationTab from './MemorizationTab';



export default function StudentProfile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { students: rawStudents, isLoading: isStudentsLoading, updateStudent } = useStudents();
    const students = rawStudents as Student[];

    const { attendance: rawAttendance, isLoading: isAttendanceLoading, refreshAttendance } = useAttendance();
    const attendance = rawAttendance as Attendance[];

    // Payments Hook
    const { payments: rawPayments, isLoading: isPaymentsLoading } = usePayments();
    const payments = rawPayments as Payment[];

    const [student, setStudent] = useState<Student | null>(null);
    const [isStudentLoadingState, setIsStudentLoadingState] = useState(true);

    const { classes, isLoading: isClassesLoading } = useClasses();
    const { suspensions, isLoading: isSuspensionsLoading, addSuspension } = useSuspensions(student?.id);

    const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
    const [suspensionForm, setSuspensionForm] = useState({
        duration_days: 1,
        reason: '',
        status: 'warning' as 'warning' | 'suspension' | 'expulsion' | 'parent_notification'
    });

    // Tab state
    const [activeTab, setActiveTab] = useState('memorization');

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        amount: 50,
        month: new Date().toLocaleString('ar-EG', { month: 'long' }),
        year: new Date().getFullYear(),
        notes: ''
    });
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        class_id: '',
        guardian_name: '',
        guardian_phone: '',
        payment_status: 'regular' as 'regular' | 'exempt'
    });

    useEffect(() => {
        if (id) {
            setIsStudentLoadingState(true);
            const fetchStudent = async () => {
                const { studentService } = await import('../../services/studentService');
                try {
                    const data = await studentService.getById(id);
                    setStudent(data);
                } catch (err) {
                    console.error(err);
                } finally {
                    setIsStudentLoadingState(false);
                }
            };
            fetchStudent();
        }
    }, [id]);

    const studentAttendance = useMemo(() =>
        attendance.filter((a: Attendance) => a.student_id === student?.id),
        [attendance, student]);

    const studentPayments = useMemo(() =>
        payments.filter((p: Payment) => p.student_id === student?.id),
        [payments, student]);

    const classAttendance = useMemo(() => {
        if (!student?.class_id) return [];
        const classmates = students.filter((s: Student) => s.class_id === student.class_id).map((s: Student) => s.id);
        return attendance.filter((a: Attendance) => classmates.includes(a.student_id));
    }, [attendance, student, students]);

    const stats = useMemo(() => {
        const total = studentAttendance.length;
        const present = studentAttendance.filter((a: Attendance) => a.present).length;
        const rate = total > 0 ? (present / total) * 100 : 0;

        // Class average
        const classTotal = classAttendance.length;
        const classPresent = classAttendance.filter((a: Attendance) => a.present).length;
        const classRate = classTotal > 0 ? (classPresent / classTotal) * 100 : 0;

        return { total, present, rate, classRate };
    }, [studentAttendance, classAttendance]);
    const handleSuspend = async () => {
        if (!student?.id) return;

        if (!suspensionForm.reason.trim()) {
            toast.error('يرجى كتابة سبب الإجراء أولاً');
            return;
        }

        try {
            if (suspensionForm.status !== 'parent_notification') {
                await updateStudent({
                    id: student.id,
                    data: { status: suspensionForm.status === 'expulsion' ? 'expelled' : suspensionForm.status === 'suspension' ? 'suspended' : 'active' }
                });
            }

            await addSuspension({
                student_id: student.id,
                type: suspensionForm.status as any,
                duration_days: suspensionForm.status === 'suspension' ? suspensionForm.duration_days : undefined,
                reason: suspensionForm.reason,
                start_date: new Date().toISOString().split('T')[0]
            });

            setIsSuspendDialogOpen(false);
            setSuspensionForm({ duration_days: 1, reason: '', status: 'warning' });
        } catch (error) {
            console.error(error);
        }
    };

    const handleEditStudent = async () => {
        if (!student?.id) return;

        try {
            await updateStudent({
                id: student.id,
                data: {
                    ...formData,
                    email: formData.email || undefined,
                    class_id: formData.class_id || undefined,
                }
            });

            // Update local state for immediate feedback
            setStudent(prev => prev ? { ...prev, ...formData } : null);

            setIsEditDialogOpen(false);
            // toast.success is already called by the hook's onSuccess, but we added one in the profile too.
            // Actually the hook calls toast.success with 'تم تعديل بيانات الطالب بنجاح'
        } catch (error) {
            console.error(error);
            toast.error('فشل في تحديث البيانات');
        }
    };

    const openEditDialog = () => {
        if (!student) return;
        setFormData({
            name: student.name,
            phone: student.phone,
            email: student.email || '',
            class_id: student.class_id || '',
            guardian_name: student.guardian_name,
            guardian_phone: student.guardian_phone,
            payment_status: student.payment_status
        });
        setIsEditDialogOpen(true);
    };

    const handleReactivate = async () => {
        if (!student?.id) return;
        if (!window.confirm('هل أنت متأكد من إعادة تفعيل هذا الطالب؟')) return;

        try {
            await updateStudent({
                id: student.id,
                data: { status: 'active' }
            });
            toast.success('تم إعادة تفعيل الطالب بنجاح');
        } catch (error) {
            console.error(error);
            toast.error('فشل في إعادة التفعيل');
        }
    };

    const handleRecordAttendance = async () => {
        if (!student?.id) return;
        try {
            const today = new Date().toISOString().split('T')[0];
            const processed = await attendanceService.markAttendance({
                student_id: student.id,
                date: today,
                present: true,
                notes: 'تسجيل سريع من ملف الطالب'
            });
            if (processed) {
                toast.success('تم تسجيل حضور الطالب لليوم');
                refreshAttendance();
            }
        } catch (error) {
            console.error(error);
            toast.error('فشل تسجيل الحضور');
        }
    };

    const handleAddPayment = async () => {
        if (!student?.id) return;
        try {
            const { paymentService } = await import('../../services/paymentService');
            await paymentService.create({
                student_id: student.id,
                amount: paymentForm.amount,
                month: paymentForm.month,
                year: paymentForm.year,
                status: 'paid',
                payment_date: new Date().toISOString(),
                notes: paymentForm.notes
            });
            toast.success('تم تسجيل الدفعة المالية بنجاح');
            setIsPaymentDialogOpen(false);
            // We should ideally refresh payments here
            window.location.reload(); // Simple way for now as we don't have refreshPayments
        } catch (error) {
            console.error(error);
            toast.error('فشل تسجيل الدفعة');
        }
    };

    const handlePrintReport = () => {
        window.print();
    };

    if (isStudentsLoading || isAttendanceLoading || isClassesLoading || isSuspensionsLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center">
                    <div className="h-12 w-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 font-medium">جاري تحميل ملف الطالب...</p>
                </div>
            </div>
        );
    }

    if (!student) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8">
                <div className="bg-red-50 p-4 rounded-full mb-4">
                    <History className="h-8 w-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">الطالب غير موجود</h2>
                <p className="text-gray-500 mb-6 max-w-md">لم نتمكن من العثور على بيانات هذا الطالب. قد يكون قد تم حذفه أو أن الرابط غير صحيح.</p>
                <Button onClick={() => navigate('/dashboard/students')}>العودة لقائمة الطلاب</Button>
            </div>
        );
    }

    const studentClass = classes.find((c: Class) => c.id === student.class_id);

    return (
        <div className="space-y-6 pb-20" dir="rtl">
            {/* 1. Header Section */}
            <StudentProfileHeader
                student={student}
                studentClass={studentClass}
                onEdit={openEditDialog}
                onSuspend={() => setIsSuspendDialogOpen(true)}
                onReactivate={handleReactivate}
            />

            {/* 2. Quick Actions */}
            <QuickActionsToolbar
                onRecordAttendance={handleRecordAttendance}
                onAddPayment={() => setIsPaymentDialogOpen(true)}
                onPrintReport={handlePrintReport}
            />

            {/* 3. Main Content Tabs */}
            <Tabs defaultValue="memorization" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mz grid w-full grid-cols-4 mb-8 bg-white border p-1 h-auto">
                    <TabsTrigger value="memorization" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 py-2.5">
                        <BookOpen className="h-4 w-4 ml-2" />
                        الحفظ
                    </TabsTrigger>
                    <TabsTrigger value="attendance" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 py-2.5">
                        <Calendar className="h-4 w-4 ml-2" />
                        <span className="hidden md:inline">سجل</span> الحضور
                    </TabsTrigger>
                    <TabsTrigger value="payments" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 py-2.5">
                        <CreditCard className="h-4 w-4 ml-2" />
                        المالية
                    </TabsTrigger>
                    <TabsTrigger value="suspensions" className="data-[state=active]:bg-red-50 data-[state=active]:text-red-700 py-2.5">
                        <History className="h-4 w-4 ml-2" />
                        السلوك
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="memorization">
                    <MemorizationTab student={student} />
                </TabsContent>

                <TabsContent value="attendance" className="animate-in fade-in-50 duration-300 slide-in-from-bottom-2">
                    <AttendanceTab attendanceRecords={studentAttendance} stats={stats} studentClass={studentClass} />
                </TabsContent>

                <TabsContent value="payments" className="mt-0">
                    <PaymentsTab payments={studentPayments} />
                </TabsContent>

                <TabsContent value="suspensions">
                    <SuspensionsTab suspensions={suspensions as any} isLoading={isSuspensionsLoading} />
                </TabsContent>
            </Tabs>

            {/* Quick Payment Dialog */}
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogContent className="sm:max-w-md" onInteractOutside={(e: any) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>تسجيل دفعة مالية سريعة</DialogTitle>
                        <DialogDescription>
                            إضافة دفعة مالية جديدة للطالب {student.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="amount">المبلغ *</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    value={paymentForm.amount}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="month">الشهر *</Label>
                                <Input
                                    id="month"
                                    value={paymentForm.month}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, month: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pay-notes">ملاحظات</Label>
                            <Input
                                id="pay-notes"
                                value={paymentForm.notes}
                                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                placeholder="اختياري"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>إلغاء</Button>
                        <Button onClick={handleAddPayment} className="bg-green-600 hover:bg-green-700 text-white">
                            تأكيد الدفع
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Student Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[30%] w-full" onInteractOutside={(e: any) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>تعديل بيانات الطالب</DialogTitle>
                        <DialogDescription>
                            قم بتعديل بيانات الطالب
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">اسم الطالب *</Label>
                                <Input
                                    id="edit-name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-phone">رقم الهاتف *</Label>
                                <Input
                                    id="edit-phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    dir="ltr"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-email">البريد الإلكتروني</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                dir="ltr"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-guardianName">اسم ولي الأمر *</Label>
                                <Input
                                    id="edit-guardianName"
                                    value={formData.guardian_name}
                                    onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-guardianPhone">هاتف ولي الأمر *</Label>
                                <Input
                                    id="edit-guardianPhone"
                                    value={formData.guardian_phone}
                                    onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
                                    dir="ltr"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-paymentStatus">حالة الرسوم</Label>
                                <Select
                                    value={formData.payment_status}
                                    onValueChange={(value: 'regular' | 'exempt') => setFormData({ ...formData, payment_status: value })}
                                >
                                    <SelectTrigger id="edit-paymentStatus">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="regular">منتظم</SelectItem>
                                        <SelectItem value="exempt">معفى</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-class">الفصل</Label>
                                <Select
                                    value={formData.class_id}
                                    onValueChange={(value) => setFormData({ ...formData, class_id: value })}
                                >
                                    <SelectTrigger id="edit-class">
                                        <SelectValue placeholder="اختر الفصل" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map((cls: Class) => (
                                            <SelectItem key={cls.id} value={cls.id || ''}>
                                                {cls.name} ({cls.grade_level})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>إلغاء</Button>
                        <Button onClick={handleEditStudent} className="bg-orange-500 hover:bg-orange-600 text-black">
                            حفظ التغييرات
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Suspend Dialog - Kept functional */}
            <Dialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
                <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e: any) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>تسجيل قرار فصل طالب</DialogTitle>
                        <DialogDescription>
                            يرجى تحديد مدة الفصل وسبب هذا الإجراء الإداري للطالب {student.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="status">نوع الإجراء *</Label>
                            <select
                                id="status"
                                className="w-full p-2 border rounded-md"
                                value={suspensionForm.status}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSuspensionForm({ ...suspensionForm, status: e.target.value as any })}
                            >
                                <option value="warning">تحذير (Warning)</option>
                                <option value="parent_notification">تنبيه ولي الأمر (Parent Notification)</option>
                                <option value="suspension">وقف مؤقت (Suspension)</option>
                                <option value="expelled">فصل نهائي (Expulsion)</option>
                            </select>
                        </div>
                        {suspensionForm.status === 'suspension' && (
                            <div className="space-y-2">
                                <Label htmlFor="duration">مدة الوقف (بالأيام) *</Label>
                                <Input
                                    id="duration"
                                    type="number"
                                    min="1"
                                    value={suspensionForm.duration_days}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSuspensionForm({ ...suspensionForm, duration_days: parseInt(e.target.value) })}
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="reason">السبب *</Label>
                            <textarea
                                id="reason"
                                className="w-full p-2 border rounded-md h-24"
                                value={suspensionForm.reason}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSuspensionForm({ ...suspensionForm, reason: e.target.value })}
                                placeholder="مثال: مخالفة القواعد المدرسية أو عدم سداد الرسوم"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSuspendDialogOpen(false)}>إلغاء</Button>
                        <Button
                            onClick={handleSuspend}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-md shadow-md transition-all duration-200"
                        >
                            تأكيد وحفظ الإجراء
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
