import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Search, Plus, Edit, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { classService } from '../../services/classService';
import { gradeService } from '../../services/gradeService';
import type { Class as ClassType, Grade } from '../../types';
import { useNavigate } from 'react-router-dom';
import { useClasses } from '../../hooks/useClasses';
import { useGrades } from '../../hooks/useGrades';
import { useStudents } from '../../hooks/useStudents';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { useTeachers } from '../../hooks/useStaff';

// Extended Class interface for UI
interface Class extends ClassType {
  currentStudents?: number;
}

const DAYS_OF_WEEK = [
  { id: 'Saturday', name: 'السبت' },
  { id: 'Sunday', name: 'الأحد' },
  { id: 'Monday', name: 'الاثنين' },
  { id: 'Tuesday', name: 'الثلاثاء' },
  { id: 'Wednesday', name: 'الأربعاء' },
  { id: 'Thursday', name: 'الخميس' },
  { id: 'Friday', name: 'الجمعة' },
];

export default function Classes() {
  const navigate = useNavigate();
  const { classes, isLoading, addClass, updateClass, deleteClass } = useClasses();
  const teachers = useTeachers();
  const NO_TEACHER = '__none__';
  const { students } = useStudents();
  // Fetch grades for dropdown (can be optimized later with own hook if needed reuse)
  const { grades } = useGrades();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    grade_level: '',
    stage: '',
    grade_id: '',
    capacity: 30,
    teacher_name: '',
    teacher_id: '',
    attendance_type: 'daily' as 'daily' | 'scheduled',
    attendance_days: [] as string[]
  });

  const [selectedClass, setSelectedClass] = useState<Class | null>(null);

  const filteredClasses = (classes as (ClassType & { studentCount?: number })[]).map(cls => ({
    ...cls,
    studentCount: students.filter(s => s.class_id === cls.id).length
  })).filter(cls =>
    cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.grade_level.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.stage.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cls.teacher_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddClass = async () => {
    if (!formData.name || !formData.grade_level || !formData.stage) {
      toast.error('الرجاء ملء الحقول الأساسية');
      return;
    }

    try {
      await addClass({
        name: formData.name,
        grade_level: formData.grade_level,
        stage: formData.stage,
        capacity: Number(formData.capacity),
        teacher_name: formData.teacher_name,
        teacher_id: formData.teacher_id || null,
        grade_id: formData.grade_id || null,
        attendance_type: formData.attendance_type,
        attendance_days: formData.attendance_days
      });

      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditClass = async () => {
    if (!selectedClass || !selectedClass.id) return;

    try {
      await updateClass({
        id: selectedClass.id,
        data: {
          name: formData.name,
          grade_level: formData.grade_level,
          stage: formData.stage,
          capacity: Number(formData.capacity),
          teacher_name: formData.teacher_name,
          teacher_id: formData.teacher_id || null,
          grade_id: formData.grade_id || null,
          attendance_type: formData.attendance_type,
          attendance_days: formData.attendance_days
        }
      });

      setIsEditDialogOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الحلقة؟')) return;

    try {
      await deleteClass(id);
    } catch (error) {
      // Error handling is inside the hook
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      grade_level: '',
      stage: '',
      grade_id: '',
      capacity: 30,
      teacher_name: '',
      teacher_id: '',
      attendance_type: 'daily',
      attendance_days: []
    });
  };

  const openEditDialog = (cls: Class) => {
    setSelectedClass(cls);
    setFormData({
      name: cls.name,
      grade_level: cls.grade_level,
      stage: cls.stage,
      grade_id: cls.grade_id || '',
      capacity: cls.capacity || 30,
      teacher_name: cls.teacher_name || '',
      teacher_id: (cls as any).teacher_id || '',
      attendance_type: cls.attendance_type || 'daily',
      attendance_days: cls.attendance_days || []
    });
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل الحلقات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl text-black mb-1">إدارة الحلقات</h2>
          <p className="text-gray-600">عرض وإدارة حلقات التحفيظ</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-orange-500 hover:bg-orange-600 text-white">
              <Plus className="ml-2 h-4 w-4" />
              إضافة حلقة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>إضافة حلقة جديدة</DialogTitle>
              <DialogDescription>
                أدخل بيانات الحلقة الجديدة
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="add-name">اسم الحلقة</Label>
                <Input
                  id="add-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: حلقة الفجر"
                />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="add-grade">المرحلة الدراسية / الصف</Label>
                  <Select
                    value={formData.grade_id}
                    onValueChange={(value) => {
                      const selectedGrade = grades.find(g => g.id === value);
                      if (selectedGrade) {
                        setFormData({
                          ...formData,
                          grade_id: value,
                          grade_level: selectedGrade.name,
                          stage: selectedGrade.stage
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المرحلة الدراسية" />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map(grade => (
                        <SelectItem key={grade.id} value={grade.id || ''}>
                          {grade.name} - {grade.stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="add-capacity">السعة الاستيعابية</Label>
                  <Input
                    id="add-capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    placeholder="30"
                  />
                </div>
                <div>
                  <Label htmlFor="add-teacher">المعلم المسؤول</Label>
{teachers.length > 0 ? (
                  <Select
                    value={formData.teacher_id || NO_TEACHER}
                    onValueChange={(value) => {
                      const t = teachers.find(x => x.id === value);
                      setFormData({ ...formData, teacher_id: t ? t.id : '', teacher_name: t ? (t.full_name || '') : '' });
                    }}
                  >
                    <SelectTrigger id="add-teacher"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_TEACHER}>بدون معلم</SelectItem>
                      {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="add-teacher"
                    value={formData.teacher_name}
                    onChange={(e) => setFormData({ ...formData, teacher_name: e.target.value })}
                    placeholder="اسم المعلم (أضف المعلمين من صفحة الموظفين لربطهم بالحلقة)"
                  />
                )}
                </div>
              </div>

              <div className="space-y-3">
                <Label>نظام الحضور</Label>
                <Select
                  value={formData.attendance_type}
                  onValueChange={(value: 'daily' | 'scheduled') => setFormData({ ...formData, attendance_type: value })}
                >
                  <SelectTrigger id="add-attendance-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">حضور يومي (جميع الأيام)</SelectItem>
                    <SelectItem value="scheduled">حضور في أيام محددة</SelectItem>
                  </SelectContent>
                </Select>

                {formData.attendance_type === 'scheduled' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 p-3 bg-gray-50 rounded-lg border">
                    {DAYS_OF_WEEK.map((day) => (
                      <div key={day.id} className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id={`add-day-${day.id}`}
                          checked={formData.attendance_days.includes(day.id)}
                          onCheckedChange={(checked) => {
                            const newDays = checked
                              ? [...formData.attendance_days, day.id]
                              : formData.attendance_days.filter(d => d !== day.id);
                            setFormData({ ...formData, attendance_days: newDays });
                          }}
                        />
                        <Label htmlFor={`add-day-${day.id}`} className="text-xs">{day.name}</Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                إلغاء
              </Button>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleAddClass}>
                إضافة الحلقة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>إجمالي الحلقات</CardDescription>
            <CardTitle className="text-3xl text-black">{classes.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>إجمالي الطلاب</CardDescription>
            <CardTitle className="text-3xl text-black">
              {students.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>السعة الإجمالية</CardDescription>
            <CardTitle className="text-3xl text-black">
              {classes.reduce((sum, cls) => sum + (cls.capacity || 0), 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="ابحث عن حلقة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Classes Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">اسم الحلقة</TableHead>
                  <TableHead className="text-right">المرحلة الدراسية</TableHead>
                  <TableHead className="text-right">المعلم</TableHead>
                  <TableHead className="text-right">الطلاب</TableHead>
                  <TableHead className="text-right">نظام الحضور</TableHead>
                  <TableHead className="text-right">السعة</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClasses.length > 0 ? (
                  filteredClasses.map((cls) => (
                    <TableRow key={cls.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/dashboard/classes/${cls.id}`)}>
                      <TableCell className="font-bold text-orange-600 hover:text-orange-700">
                        {cls.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{cls.stage}</span>
                          <span className="text-xs text-gray-500">{cls.grade_level}</span>
                        </div>
                      </TableCell>
                      <TableCell>{cls.teacher_name || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>{cls.studentCount || 0} / {cls.capacity}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {cls.attendance_type === 'scheduled' ? (
                          <div className="flex flex-wrap gap-1">
                            {cls.attendance_days?.map(d => (
                              <Badge key={d} variant="outline" className="text-[10px] px-1 py-0">
                                {DAYS_OF_WEEK.find(dw => dw.id === d)?.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-blue-600 font-medium">يومي</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-orange-500 h-2 rounded-full"
                            style={{ width: `${Math.min(100, ((cls.studentCount || 0) / (cls.capacity || 1)) * 100)}%` }}
                          ></div>
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(cls)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteClass(cls.id || '')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      لا توجد نتائج
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>تعديل بيانات الحلقة</DialogTitle>
            <DialogDescription>
              قم بتعديل بيانات الحلقة
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">اسم الحلقة</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="edit-grade">المرحلة الدراسية / الصف</Label>
                <Select
                  value={formData.grade_id}
                  onValueChange={(value) => {
                    const selectedGrade = grades.find(g => g.id === value);
                    if (selectedGrade) {
                      setFormData({
                        ...formData,
                        grade_id: value,
                        grade_level: selectedGrade.name,
                        stage: selectedGrade.stage
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المرحلة الدراسية" />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map(grade => (
                      <SelectItem key={grade.id} value={grade.id || ''}>
                        {grade.name} - {grade.stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-capacity">السعة الاستيعابية</Label>
                <Input
                  id="edit-capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="edit-teacher">المعلم المسؤول</Label>
{teachers.length > 0 ? (
                  <Select
                    value={formData.teacher_id || NO_TEACHER}
                    onValueChange={(value) => {
                      const t = teachers.find(x => x.id === value);
                      setFormData({ ...formData, teacher_id: t ? t.id : '', teacher_name: t ? (t.full_name || '') : '' });
                    }}
                  >
                    <SelectTrigger id="edit-teacher"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_TEACHER}>بدون معلم</SelectItem>
                      {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                <Input
                  id="edit-teacher"
                  value={formData.teacher_name}
                  onChange={(e) => setFormData({ ...formData, teacher_name: e.target.value })}
                />
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label>نظام الحضور</Label>
              <Select
                value={formData.attendance_type}
                onValueChange={(value: 'daily' | 'scheduled') => setFormData({ ...formData, attendance_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">حضور يومي (جميع الأيام)</SelectItem>
                  <SelectItem value="scheduled">حضور في أيام محددة</SelectItem>
                </SelectContent>
              </Select>

              {formData.attendance_type === 'scheduled' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 p-3 bg-gray-50 rounded-lg border">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.id} className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id={`edit-day-${day.id}`}
                        checked={formData.attendance_days.includes(day.id)}
                        onCheckedChange={(checked) => {
                          const newDays = checked
                            ? [...formData.attendance_days, day.id]
                            : formData.attendance_days.filter(d => d !== day.id);
                          setFormData({ ...formData, attendance_days: newDays });
                        }}
                      />
                      <Label htmlFor={`edit-day-${day.id}`} className="text-xs">{day.name}</Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleEditClass}>
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
