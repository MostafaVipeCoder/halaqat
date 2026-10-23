import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Search, Plus, Eye, DollarSign, AlertCircle, CheckCircle, Download, Filter, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../ui/pagination';
import { Payment } from '../../services/paymentService';
import { usePayments } from '../../hooks/usePayments';
import { useStudents } from '../../hooks/useStudents';
import { useClasses } from '../../hooks/useClasses';

export default function Payments() {
  const { payments, stats, isLoading: isPaymentsLoading, createPayment, updatePayment, deletePayment } = usePayments();
  const { students, isLoading: isStudentsLoading } = useStudents();
  const { classes } = useClasses();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'unpaid'>('all');

  // Column specific filters
  const [descFilter, setDescFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [dateFilter, setDateFilter] = useState('');

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Payment | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    studentId: '',
    amount: '',
    description: '',
    dueDate: new Date(),
  });

  const [bulkFormData, setBulkFormData] = useState({
    targetType: 'all' as 'all' | 'class' | 'student',
    classFilter: '',
    studentId: '',
    amount: '',
    description: '',
    dueDate: new Date(),
  });

  const filteredInvoices = payments.filter(invoice => {
    const studentName = invoice.students?.name || '';
    const description = invoice.notes || '';
    const invoiceDate = invoice.created_at ? format(new Date(invoice.created_at), 'yyyy-MM-dd') : '';

    // Global Search
    const matchesGlobal = studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      description.toLowerCase().includes(searchTerm.toLowerCase());

    // Column Filters
    const matchesDesc = description.toLowerCase().includes(descFilter.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'paid' && invoice.status === 'paid') ||
      (statusFilter === 'unpaid' && invoice.status !== 'paid');
    const matchesDate = !dateFilter || invoiceDate.includes(dateFilter);

    // Legacy mapping or shared status filter
    const matchesLegacyStatus = filterStatus === 'all' ||
      (filterStatus === 'paid' && invoice.status === 'paid') ||
      (filterStatus === 'unpaid' && invoice.status !== 'paid');

    return matchesGlobal && matchesDesc && matchesStatus && matchesDate && matchesLegacyStatus;
  });

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleAddInvoice = async () => {
    if (!formData.studentId || !formData.amount || !formData.description) {
      toast.error('الرجاء ملء جميع الحقول المطلوبة');
      return;
    }

    const student = students.find(s => s.id === formData.studentId);
    if (!student) {
      toast.error('الطالب غير موجود');
      return;
    }

    if (student.payment_status === 'exempt') {
      toast.error('⚠️ هذا الطالب معفي من المصاريف');
      return;
    }

    try {
      const dueDate = formData.dueDate;
      const month = format(dueDate, 'MMMM', { locale: ar });
      const year = parseInt(format(dueDate, 'yyyy'));

      await createPayment({
        student_id: formData.studentId,
        amount: parseFloat(formData.amount),
        notes: formData.description,
        month: month,
        year: year,
        status: 'unpaid',
      });

      setFormData({ studentId: '', amount: '', description: '', dueDate: new Date() });
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Error creating invoice:', error);
    }
  };

  const handleBulkInvoice = async () => {
    if (!bulkFormData.amount || !bulkFormData.description) {
      toast.error('الرجاء ملء جميع الحقول المطلوبة');
      return;
    }

    let targetStudents: any[] = [];

    if (bulkFormData.targetType === 'all') {
      targetStudents = students.filter(s => s.payment_status === 'regular');
    } else if (bulkFormData.targetType === 'class') {
      if (!bulkFormData.classFilter) {
        toast.error('الرجاء اختيار الصف');
        return;
      }
      targetStudents = students.filter(s => s.classes?.id === bulkFormData.classFilter && s.payment_status === 'regular');
    } else if (bulkFormData.targetType === 'student') {
      if (!bulkFormData.studentId) {
        toast.error('الرجاء اختيار الطالب');
        return;
      }
      const student = students.find(s => s.id === bulkFormData.studentId);
      if (student) {
        if (student.payment_status === 'exempt') {
          toast.error('⚠️ هذا الطالب معفي من المصاريف');
          return;
        }
        targetStudents = [student];
      }
    }

    if (targetStudents.length === 0) {
      toast.error('لا توجد طلاب مؤهلين لإصدار الفواتير');
      return;
    }

    try {
      const dueDate = bulkFormData.dueDate;
      const month = format(dueDate, 'MMMM', { locale: ar });
      const year = parseInt(format(dueDate, 'yyyy'));

      const promises = targetStudents.map(student =>
        createPayment({
          student_id: student.id!,
          amount: parseFloat(bulkFormData.amount),
          notes: bulkFormData.description,
          month: month,
          year: year,
          status: 'unpaid',
        })
      );

      await Promise.all(promises);

      setBulkFormData({
        targetType: 'all',
        classFilter: '',
        studentId: '',
        amount: '',
        description: '',
        dueDate: new Date(),
      });
      setIsBulkDialogOpen(false);
      toast.success(`تم إصدار ${targetStudents.length} فاتورة بنجاح`);
    } catch (error) {
      console.error('Error processing bulk invoices:', error);
    }
  };

  const handleMarkAsPaid = async (payment: Payment) => {
    try {
      if (!payment.id) return;
      await updatePayment({
        id: payment.id,
        data: {
          status: 'paid',
          payment_date: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  };

  const handleMarkAsUnpaid = async (payment: Payment) => {
    try {
      if (!payment.id) return;
      await updatePayment({
        id: payment.id,
        data: {
          status: 'unpaid',
          payment_date: undefined
        }
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  };

  const handleDownloadInvoice = (invoice: Payment) => {
    toast.success('تم تنزيل الفاتورة (ميزة تجريبية)');
  };

  if (isPaymentsLoading || isStudentsLoading) {
    return <div className="p-8 text-center">جاري تحميل البيانات...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl text-black mb-1">إدارة المدفوعات</h2>
          <p className="text-gray-600">إصدار وإدارة الفواتير والمدفوعات</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                <Plus className="ml-2 h-4 w-4" />
                إضافة فاتورة
              </Button>
            </DialogTrigger>
            <DialogContent onInteractOutside={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>إضافة فاتورة جديدة</DialogTitle>
                <DialogDescription>
                  أدخل بيانات الفاتورة
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="add-student">الطالب <span className="text-red-500">*</span></Label>
                  <Select value={formData.studentId} onValueChange={(value) => setFormData({ ...formData, studentId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الطالب" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map(student => (
                        <SelectItem key={student.id} value={student.id || ''}>
                          {student.name} - {student.classes?.name || 'بدون صف'} {student.payment_status === 'exempt' ? '(معفى)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.studentId && students.find(s => s.id === formData.studentId)?.payment_status === 'exempt' && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 text-red-600 rounded-md text-sm border border-red-100 animate-pulse">
                      <AlertCircle className="h-4 w-4" />
                      <span>هذا الطالب معفي من المصاريف</span>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="add-amount">المبلغ (ج.م) <span className="text-red-500">*</span></Label>
                  <Input
                    id="add-amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="1000"
                  />
                </div>
                <div>
                  <Label htmlFor="add-description">الوصف <span className="text-red-500">*</span></Label>
                  <Input
                    id="add-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="رسوم شهر نوفمبر"
                  />
                </div>
                <div>
                  <Label>تاريخ الاستحقاق <span className="text-red-500">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-right">
                        {format(formData.dueDate, 'PPP', { locale: ar })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.dueDate}
                        onSelect={(date) => date && setFormData({ ...formData, dueDate: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={handleAddInvoice}
                  disabled={formData.studentId ? students.find(s => s.id === formData.studentId)?.payment_status === 'exempt' : false}
                >
                  إضافة الفاتورة
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <DollarSign className="ml-2 h-4 w-4" />
                إصدار فواتير جماعي
              </Button>
            </DialogTrigger>
            <DialogContent onInteractOutside={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>إصدار فواتير جماعي</DialogTitle>
                <DialogDescription>
                  إصدار فواتير لعدة طلاب دفعة واحدة
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>نوع الإصدار</Label>
                  <Select value={bulkFormData.targetType} onValueChange={(value: 'all' | 'class' | 'student') => setBulkFormData({ ...bulkFormData, targetType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الطلاب</SelectItem>
                      <SelectItem value="class">طلاب صف معين</SelectItem>
                      <SelectItem value="student">طالب معين</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {bulkFormData.targetType === 'class' && (
                  <div>
                    <Label>الصف</Label>
                    <Select value={bulkFormData.classFilter} onValueChange={(value) => setBulkFormData({ ...bulkFormData, classFilter: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الصف" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {bulkFormData.targetType === 'student' && (
                  <div>
                    <Label>الطالب</Label>
                    <Select value={bulkFormData.studentId} onValueChange={(value) => setBulkFormData({ ...bulkFormData, studentId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الطالب" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map(student => (
                          <SelectItem key={student.id} value={student.id || ''}>
                            {student.name} - {student.classes?.name || ''} {student.payment_status === 'exempt' ? '(معفى)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {bulkFormData.targetType === 'student' && bulkFormData.studentId && students.find(s => s.id === bulkFormData.studentId)?.payment_status === 'exempt' && (
                      <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 text-red-600 rounded-md text-sm border border-red-100 animate-pulse">
                        <AlertCircle className="h-4 w-4" />
                        <span>هذا الطالب معفي من المصاريف</span>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Label>المبلغ (ج.م) <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    value={bulkFormData.amount}
                    onChange={(e) => setBulkFormData({ ...bulkFormData, amount: e.target.value })}
                    placeholder="1000"
                  />
                </div>
                <div>
                  <Label>الوصف <span className="text-red-500">*</span></Label>
                  <Input
                    value={bulkFormData.description}
                    onChange={(e) => setBulkFormData({ ...bulkFormData, description: e.target.value })}
                    placeholder="رسوم شهر نوفمبر"
                  />
                </div>
                <div>
                  <Label>تاريخ الاستحقاق <span className="text-red-500">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-right">
                        {format(bulkFormData.dueDate, 'PPP', { locale: ar })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={bulkFormData.dueDate}
                        onSelect={(date) => date && setBulkFormData({ ...bulkFormData, dueDate: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={handleBulkInvoice}
                  disabled={bulkFormData.targetType === 'student' && bulkFormData.studentId ? students.find(s => s.id === bulkFormData.studentId)?.payment_status === 'exempt' : false}
                >
                  إصدار الفواتير
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>إجمالي المدفوعات</CardDescription>
            <CardTitle className="text-3xl text-black">{stats?.totalAmount || 0} ج.م</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>المدفوعات المحصلة</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats?.collectedAmount || 0} ج.م</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>المدفوعات المستحقة</CardDescription>
            <CardTitle className="text-3xl text-red-600">{stats?.pendingAmount || 0} ج.م</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Global Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative w-full">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="البحث العام (اسم الطالب، الوصف)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right min-w-[150px]">
                    <div className="flex flex-col gap-2 py-2">
                      <div className="flex items-center gap-2">
                        <span>التاريخ</span>
                        <Filter className="h-3 w-3 text-gray-400" />
                      </div>
                      <Input
                        placeholder="فلترة بالتاريخ..."
                        className="h-8 text-xs font-normal"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">اسم الطالب</TableHead>
                  <TableHead className="text-right min-w-[200px]">
                    <div className="flex flex-col gap-2 py-2">
                      <div className="flex items-center gap-2">
                        <span>الوصف</span>
                        <Filter className="h-3 w-3 text-gray-400" />
                      </div>
                      <Input
                        placeholder="فلترة بالوصف..."
                        className="h-8 text-xs font-normal"
                        value={descFilter}
                        onChange={(e) => setDescFilter(e.target.value)}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">الشهر/السنة</TableHead>
                  <TableHead className="text-right min-w-[150px]">
                    <div className="flex flex-col gap-2 py-2">
                      <div className="flex items-center gap-2">
                        <span>الحالة</span>
                        <Filter className="h-3 w-3 text-gray-400" />
                      </div>
                      <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          <SelectItem value="paid">مدفوعة</SelectItem>
                          <SelectItem value="unpaid">غير مدفوعة</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInvoices.length > 0 ? (
                  paginatedInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium text-xs text-gray-500">
                        {invoice.created_at ? format(new Date(invoice.created_at), 'yyyy-MM-dd') : '-'}
                      </TableCell>
                      <TableCell>{invoice.students?.name || 'غير معروف'}</TableCell>
                      <TableCell>{invoice.notes || '-'}</TableCell>
                      <TableCell>{invoice.amount} ج.م</TableCell>
                      <TableCell>{invoice.month} {invoice.year}</TableCell>
                      <TableCell>
                        <Badge variant={invoice.status === 'paid' ? 'default' : 'destructive'}>
                          {invoice.status === 'paid' ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              مدفوعة
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              غير مدفوعة
                            </span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setIsViewDialogOpen(true);
                            }}
                            title="عرض التفاصيل"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadInvoice(invoice)}
                            title="تنزيل الفاتورة"
                          >
                            <Download className="h-4 w-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:bg-red-50"
                                title="حذف الفاتورة"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>حذف الفاتورة</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هل أنت متأكد من حذف هذه الفاتورة؟ لا يمكن التراجع عن هذا الإجراء.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => invoice.id && deletePayment(invoice.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          {invoice.status === 'paid' ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-orange-600"
                                >
                                  <AlertCircle className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>تحديث حالة الفاتورة</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    هل تريد تحديث حالة الفاتورة إلى غير مدفوعة؟
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleMarkAsUnpaid(invoice)}>
                                    تأكيد
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>تأكيد الدفع</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    هل تريد تحديث حالة الفاتورة إلى مدفوعة؟
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleMarkAsPaid(invoice)}>
                                    تأكيد
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      لا توجد فواتير
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination dir="ltr">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => setCurrentPage(page)}
                  isActive={currentPage === page}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* View Invoice Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تفاصيل الفاتورة</DialogTitle>
            <DialogDescription>
              عرض معلومات الفاتورة الكاملة
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">اسم الطالب</p>
                <p className="text-black">{selectedInvoice?.students?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">المبلغ</p>
                <p className="text-black">{selectedInvoice?.amount} ج.م</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">الوصف</p>
                <p className="text-black">{selectedInvoice?.notes}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">تاريخ الإصدار</p>
                <p className="text-black">
                  {selectedInvoice?.created_at && format(new Date(selectedInvoice.created_at), 'PPP', { locale: ar })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">فترة الاستحقاق</p>
                <p className="text-black">
                  {selectedInvoice?.month} {selectedInvoice?.year}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">الحالة</p>
                <Badge variant={selectedInvoice?.status === 'paid' ? 'default' : 'destructive'}>
                  {selectedInvoice?.status === 'paid' ? 'مدفوعة' : 'غير مدفوعة'}
                </Badge>
              </div>
              {selectedInvoice?.status === 'paid' && selectedInvoice.payment_date && (
                <div>
                  <p className="text-sm text-gray-600">تاريخ الدفع</p>
                  <p className="text-black">
                    {format(new Date(selectedInvoice.payment_date), 'PPP', { locale: ar })}
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
