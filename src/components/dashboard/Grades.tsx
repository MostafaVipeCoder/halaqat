import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Search, Plus, Edit, Trash2, School } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { gradeService } from '../../services/gradeService';
import type { Grade as GradeType } from '../../types';
import { useGrades } from '../../hooks/useGrades';
import { useSettings } from '../../hooks/useSettings';

// Extended Grade interface for UI
interface Grade extends GradeType {
  classCount?: number;
  studentCount?: number;
}

export default function Grades() {
  const { grades, isLoading, addGrade, updateGrade, deleteGrade } = useGrades();
  const { settings } = useSettings();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    stage: '',
    description: ''
  });

  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);

  const filteredGrades = grades.filter(grade =>
    grade.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (grade.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddGrade = async () => {
    if (!formData.name || !formData.stage) {
      toast.error('الرجاء ملء الحقول الأساسية');
      return;
    }

    // Check for duplicates
    const isDuplicate = grades.some(
      (g) => g.name.trim().toLowerCase() === formData.name.trim().toLowerCase() &&
        g.stage === formData.stage
    );

    if (isDuplicate) {
      toast.error('هذه المرحلة مسجلة بالفعل في هذا النظام');
      return;
    }

    try {
      // Optimistic update happens immediately in the hook
      await addGrade({
        name: formData.name,
        stage: formData.stage,
        description: formData.description
      });

      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditGrade = async () => {
    if (!selectedGrade || !selectedGrade.id) return;

    // Check for duplicates (excluding the current grade being edited)
    const isDuplicate = grades.some(
      (g) => g.id !== selectedGrade.id &&
        g.name.trim().toLowerCase() === formData.name.trim().toLowerCase() &&
        g.stage === formData.stage
    );

    if (isDuplicate) {
      toast.error('هذه المرحلة مسجلة بالفعل في هذا النظام');
      return;
    }

    try {
      await updateGrade({
        id: selectedGrade.id,
        data: {
          name: formData.name,
          stage: formData.stage,
          description: formData.description
        }
      });

      setIsEditDialogOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteGrade = async (id: string) => {
    const grade = grades.find(g => g.id === id);

    // Check if grade has classes or students
    if (grade && (grade.classCount || 0) > 0) {
      toast.error('لا يمكن حذف مرحلة مرتبطة بحلقات. قم بحذف الحلقات أولاً.');
      return;
    }

    if (grade && (grade.studentCount || 0) > 0) {
      toast.error('لا يمكن حذف مرحلة مرتبطة بطلاب مسجلين. قم بنقل أو حذف الطلاب أولاً.');
      return;
    }

    if (!window.confirm('هل أنت متأكد من حذف هذه المرحلة؟')) return;

    try {
      await deleteGrade(id);
    } catch (error) {
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', stage: '', description: '' });
  };

  const openEditDialog = (grade: Grade) => {
    setSelectedGrade(grade);
    setFormData({
      name: grade.name,
      stage: grade.stage,
      description: grade.description || ''
    });
    setIsEditDialogOpen(true);
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
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl text-black mb-1">المراحل الدراسية</h2>
          <p className="text-gray-600">إدارة المراحل الدراسية وتعريف الصفوف</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-orange-500 hover:bg-orange-600 text-white">
              <Plus className="ml-2 h-4 w-4" />
              إضافة مرحلة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>إضافة مرحلة دراسية جديدة</DialogTitle>
              <DialogDescription>
                أدخل بيانات المرحلة الدراسية الجديدة
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="add-name">اسم الصف (مثال: الصف الأول)</Label>
                <Input
                  id="add-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: الصف الأول"
                />
              </div>
              <div>
                <Label htmlFor="add-stage">المرحلة العامة</Label>
                <Select value={formData.stage} onValueChange={(value) => setFormData({ ...formData, stage: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المرحلة" />
                  </SelectTrigger>
                  <SelectContent>
                    {settings.available_stages.map((stage: string) => (
                      <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="add-description">الوصف</Label>
                <Input
                  id="add-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف إضافي..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                إلغاء
              </Button>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleAddGrade}>
                إضافة المرحلة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>إجمالي المراحل/الصفوف</CardDescription>
            <CardTitle className="text-3xl text-black">{grades.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>إجمالي الحلقات المفتوحة</CardDescription>
            <CardTitle className="text-3xl text-black">
              {grades.reduce((sum, grade) => sum + (grade.classCount || 0), 0)}
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
              placeholder="ابحث عن مرحلة دراسية..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Grades Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGrades.map((grade) => (
          <Card key={grade.id} className="hover:border-orange-500 transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500/10 p-3 rounded-lg">
                    <School className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <CardTitle className="text-black">{grade.name}</CardTitle>
                    <CardDescription className="mt-1">{grade.stage}</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">{grade.description || 'لا يوجد وصف'}</p>

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-gray-600">عدد الحلقات</span>
                <Badge variant="secondary">{grade.classCount || 0} حلقة</Badge>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-sm text-gray-600">إجمالي الطلاب</span>
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  {grade.studentCount || 0} طالب
                </Badge>
              </div>

              <div className="pt-4 border-t flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditDialog(grade)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleDeleteGrade(grade.id || '')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredGrades.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            لا توجد مراحل مطابقة للبحث
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>تعديل بيانات المرحلة</DialogTitle>
            <DialogDescription>
              قم بتعديل بيانات المرحلة الدراسية
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">اسم الصف</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-stage">المرحلة العامة</Label>
              <Select value={formData.stage} onValueChange={(value) => setFormData({ ...formData, stage: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {settings.available_stages.map((stage: string) => (
                    <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-description">الوصف</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleEditGrade}>
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
