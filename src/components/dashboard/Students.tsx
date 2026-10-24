import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Search, Plus, Edit, Trash2, UserPlus, Check, Calendar, Eye, QrCode, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../ui/pagination';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import StudentQRCode from './StudentQRCode';
import { studentService } from '../../services/studentService';
import { classService } from '../../services/classService';
import type { Student as StudentType, Class } from '../../types';
import { supabase } from '../../lib/supabase';
import { useStudents } from '../../hooks/useStudents';
import { useCurrentProfile } from '../../hooks/useCurrentProfile';
import { useClasses } from '../../hooks/useClasses';
import StudentCard from './StudentCard';
import StudentFilters from './StudentFilters';
import ViewToggle from './ViewToggle';

// Extended Student interface for UI display
interface Student extends StudentType {
  classes?: {
    id: string;
    name: string;
    grade_level: string;
    stage?: string;
  };
}

interface AttendanceRecord {
  studentId: string;
  date: string;
  present: boolean;
}

export default function Students() {
  const { students: rawStudents, isLoading, addStudent, updateStudent, deleteStudent } = useStudents();
  const { can } = useCurrentProfile();
  const canManageStudents = can('students.manage');
  const students = rawStudents as Student[];
  const { classes: availableClasses } = useClasses();
  const navigate = useNavigate();

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');

  // Auto-switch to cards view on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewMode('cards');
      }
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [filters, setFilters] = useState({
    classId: 'all',
    paymentStatus: 'all'
  });
  const itemsPerPage = viewMode === 'cards' ? 6 : 5; // More items for card view

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    class_id: '',
    guardian_name: '',
    guardian_phone: '',
    payment_status: 'regular' as 'regular' | 'exempt'
  });

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Data loading is now handled by React Query hooks

  const filteredStudents = students.filter(student => {
    // Search filter
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      student.phone.includes(searchTerm) ||
      (student.guardian_name || '').toLowerCase().includes(searchTerm.toLowerCase());

    // Class filter
    const matchesClass = filters.classId === 'all' || student.class_id === filters.classId;

    // Payment status filter
    const matchesPayment = filters.paymentStatus === 'all' || student.payment_status === filters.paymentStatus;

    // Status filter - Exclude expelled from main list
    const isNotExpelled = student.status !== 'expelled';

    return matchesSearch && matchesClass && matchesPayment && isNotExpelled;
  });

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const currentStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  const handleFilterChange = (newFilters: { classId: string; paymentStatus: string }) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({ classId: 'all', paymentStatus: 'all' });
    setCurrentPage(1);
  };

  const handleAddStudent = async () => {
    if (!formData.name || !formData.phone || !formData.guardian_name || !formData.guardian_phone || !formData.class_id) {
      toast.error('الرجاء ملء جميع الحقول المطلوبة واختيار الحلقة');
      return;
    }

    try {
      await addStudent({
        ...formData,
        email: formData.email || undefined,
        class_id: formData.class_id || undefined,
      });

      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditStudent = async () => {
    if (!selectedStudent || !selectedStudent.id) return;

    try {
      await updateStudent({
        id: selectedStudent.id,
        data: {
          ...formData,
          email: formData.email || undefined,
          class_id: formData.class_id || undefined,
        }
      });

      setIsEditDialogOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الطالب؟')) {
      try {
        await deleteStudent(id);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleAssignClass = async () => {
    if (!selectedStudent || !selectedStudent.id || !formData.class_id) return;

    try {
      await updateStudent({
        id: selectedStudent.id,
        data: { class_id: formData.class_id }
      });

      toast.success('تم تعيين الحلقة بنجاح');
      setIsAssignDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('فشل تعيين الحلقة');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      class_id: '',
      guardian_name: '',
      guardian_phone: '',
      payment_status: 'regular'
    });
  };

  const openEditDialog = (student: Student) => {
    setSelectedStudent(student);
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

  const openAssignDialog = (student: Student) => {
    setSelectedStudent(student);
    setFormData(prev => ({ ...prev, class_id: student.class_id || '' }));
    setIsAssignDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">جميع الطلاب</h1>
          <p className="text-gray-500">عرض وإدارة جميع الطلاب المسجلين في النظام</p>
        </div>
        {canManageStudents && (
          <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }} className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus className="ml-2 h-4 w-4" />
            إضافة طالب جديد
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">إجمالي الطلاب</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserPlus className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
            <p className="text-xs text-gray-500">طالب مسجل في النظام</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">الطلاب المنتظمين</CardTitle>
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.filter(s => s.payment_status === 'regular').length}
            </div>
            <p className="text-xs text-gray-500">طالب دفع الرسوم</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">طلاب موقوفين/مفصولين</CardTitle>
            <div className="p-2 bg-red-100 rounded-lg">
              <ShieldAlert className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.filter(s => s.status && s.status !== 'active').length}
            </div>
            <p className="text-xs text-gray-500">طالب غير نشط حالياً</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and View Toggle */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="بحث عن طالب..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
        <ViewToggle view={viewMode} onViewChange={setViewMode} />
      </div>

      {/* Filters */}
      <StudentFilters
        classes={availableClasses}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      {/* Content - Table or Cards View */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">اسم الطالب</TableHead>
                  <TableHead className="text-right">الحلقة</TableHead>
                  <TableHead className="text-right">ولي الأمر</TableHead>
                  <TableHead className="text-right">رقم الهاتف</TableHead>
                  <TableHead className="text-right">حالة الرسوم</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentStudents.length > 0 ? (
                  currentStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>
                        {student.classes ? (
                          <div className="flex flex-col">
                            <span className="font-medium">{student.classes.name}</span>
                            <span className="text-xs text-gray-500">{student.classes.grade_level}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">غير معين</span>
                        )}
                      </TableCell>
                      <TableCell>{student.guardian_name}</TableCell>
                      <TableCell dir="ltr" className="text-right">{student.phone}</TableCell>
                      <TableCell>
                        <Badge variant={student.payment_status === 'regular' ? 'default' : 'secondary'}>
                          {student.payment_status === 'regular' ? 'منتظم' : 'معفى'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={student.status === 'suspended' ? 'bg-yellow-500 hover:bg-yellow-600' : student.status === 'expelled' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}>
                          {student.status === 'suspended' ? 'موقوف' : student.status === 'expelled' ? 'مفصول' : 'نشط'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard/students/${student.slug || student.id}`)}>
                            <Eye className="h-4 w-4 text-orange-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(student)}>
                            <Edit className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openAssignDialog(student)}>
                            <UserPlus className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedStudent(student); setIsQRDialogOpen(true); }}>
                            <QrCode className="h-4 w-4 text-purple-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteStudent(student.id || '')}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      لا توجد نتائج
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          isActive={currentPage === page}
                          onClick={() => setCurrentPage(page)}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Cards View */
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentStudents.length > 0 ? (
              currentStudents.map((student) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  onView={(s) => navigate(`/dashboard/students/${s.slug || s.id}`)}
                  onEdit={openEditDialog}
                  onDelete={handleDeleteStudent}
                  onStatusUpdate={(id, status) => updateStudent({ id, data: { status } })}
                  onShowQR={(s) => { setSelectedStudent(s); setIsQRDialogOpen(true); }}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500">لا توجد نتائج</p>
              </div>
            )}
          </div>

          {/* Pagination for Cards */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>إضافة طالب جديد</DialogTitle>
            <DialogDescription>
              أدخل بيانات الطالب الجديد أدناه. جميع الحقول المميزة بـ * مطلوبة.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم الطالب *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="الاسم الثلاثي"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="example@email.com"
                dir="ltr"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guardianName">اسم ولي الأمر *</Label>
                <Input
                  id="guardianName"
                  value={formData.guardian_name}
                  onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
                  placeholder="اسم ولي الأمر"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardianPhone">هاتف ولي الأمر *</Label>
                <Input
                  id="guardianPhone"
                  value={formData.guardian_phone}
                  onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
                  placeholder="01xxxxxxxx"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentStatus">حالة الرسوم</Label>
                <Select
                  value={formData.payment_status}
                  onValueChange={(value: 'regular' | 'exempt') => setFormData({ ...formData, payment_status: value })}
                >
                  <SelectTrigger id="paymentStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">منتظم في الدفع</SelectItem>
                    <SelectItem value="exempt">معفى من الدفع</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="class">الحلقة</Label>
                <Select
                  value={formData.class_id}
                  onValueChange={(value) => setFormData({ ...formData, class_id: value })}
                >
                  <SelectTrigger id="class">
                    <SelectValue placeholder="اختر الحلقة" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClasses.map((cls) => (
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
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleAddStudent} className="bg-orange-500 hover:bg-orange-600 text-white">
              حفظ الطالب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[30%] w-full" onInteractOutside={(e) => e.preventDefault()}>
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
                <Label htmlFor="edit-class">الحلقة</Label>
                <Select
                  value={formData.class_id}
                  onValueChange={(value) => setFormData({ ...formData, class_id: value })}
                >
                  <SelectTrigger id="edit-class">
                    <SelectValue placeholder="اختر الحلقة" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClasses.map((cls) => (
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
            <Button onClick={handleEditStudent} className="bg-orange-500 hover:bg-orange-600 text-white">
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Class Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>تعيين حلقة للطالب</DialogTitle>
            <DialogDescription>
              اختر الحلقة المناسبة للطالب {selectedStudent?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="assign-class">الحلقة</Label>
              <Select
                value={formData.class_id}
                onValueChange={(value) => setFormData({ ...formData, class_id: value })}
              >
                <SelectTrigger id="assign-class">
                  <SelectValue placeholder="اختر الحلقة" />
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id || ''}>
                      {cls.name} ({cls.grade_level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleAssignClass} className="bg-orange-500 hover:bg-orange-600 text-white">
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      {selectedStudent && (
        <StudentQRCode
          open={isQRDialogOpen}
          onOpenChange={setIsQRDialogOpen}
          student={{
            id: selectedStudent.id || '',
            name: selectedStudent.name,
            classes: selectedStudent.classes,
            phone: selectedStudent.phone
          }}
        />
      )}
    </div>
  );
}
