import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Card, CardContent } from '../ui/card';
import { Search, RotateCcw, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import { useStudents } from '../../hooks/useStudents';
import { Badge } from '../ui/badge';

export default function ExpelledStudents() {
    const { students: allStudents, isLoading, updateStudent, deleteStudent } = useStudents();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    const expelledStudents = (allStudents || []).filter(s =>
        s.status === 'expelled' &&
        (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.phone.includes(searchTerm))
    );

    const handleReinstate = async (id: string) => {
        if (confirm('هل أنت متأكد من إعادة هذا الطالب للنظام؟ ستتغير حالته إلى "منتظم".')) {
            try {
                await updateStudent({ id, data: { status: 'active' } });
                toast.success('تمت إعادة الطالب بنجاح');
            } catch (error) {
                toast.error('حدث خطأ أثناء محاولة إعادة الطالب');
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('تحذير: هذا الإجراء سيقوم بحذف بيانات الطالب نهائياً من النظام. هل أنت متأكد؟')) {
            try {
                await deleteStudent(id);
                toast.success('تم حذف الطالب نهائياً');
            } catch (error) {
                toast.error('حدث خطأ أثناء محاولة الحذف');
            }
        }
    };

    return (
        <div className="space-y-6" dir="rtl">
            <div>
                <h2 className="text-2xl font-bold text-red-700 mb-1">إدارة الطلاب المفصولين</h2>
                <p className="text-gray-600">هنا تظهر قائمة الطلاب الذين تم استبعادهم من النظام</p>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="relative mb-6">
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="ابحث بالاسم أو رقم الهاتف..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pr-10"
                        />
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50">
                                    <TableHead className="text-right">الطالب</TableHead>
                                    <TableHead className="text-right">الحلقة</TableHead>
                                    <TableHead className="text-right">رقم الهاتف</TableHead>
                                    <TableHead className="text-right">تاريخ الاستبعاد</TableHead>
                                    <TableHead className="text-center">الإجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expelledStudents.length > 0 ? (
                                    expelledStudents.map((student) => (
                                        <TableRow key={student.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-red-50 p-2 rounded-full">
                                                        <User className="h-4 w-4 text-red-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold underline cursor-pointer hover:text-red-700" onClick={() => navigate(`/dashboard/students/${student.slug || student.id || ''}`)}>
                                                            {student.name}
                                                        </p>
                                                        <Badge variant="outline" className="text-[10px] text-red-600 border-red-200">مفصول</Badge>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{student.classes?.name || 'غير محدد'}</TableCell>
                                            <TableCell>{student.phone}</TableCell>
                                            <TableCell className="text-gray-500 text-xs">
                                                {student.updated_at ? new Date(student.updated_at).toLocaleDateString('ar-EG') : 'غير محدد'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-green-600 border-green-200 hover:bg-green-50"
                                                        onClick={() => handleReinstate(student.id || '')}
                                                        title="إعادة للنظام"
                                                    >
                                                        <RotateCcw className="h-4 w-4 ml-1" />
                                                        إعادة
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleDelete(student.id || '')}
                                                        title="حذف نهائي"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-gray-500 font-medium">
                                            {isLoading ? 'جاري التحميل...' : 'لا يوجد طلاب مفصولون حالياً'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
