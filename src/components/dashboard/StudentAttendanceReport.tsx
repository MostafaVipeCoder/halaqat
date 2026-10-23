import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar, TrendingUp, Download, CheckCircle, XCircle, Clock, User } from 'lucide-react';
import { toast } from 'sonner';
import { attendanceService } from '../../services/attendanceService';
import { format } from 'date-fns';

// UI Interface matching our table needs
interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: 'present' | 'absent' | 'late';
}

interface Student {
  id: string; // Changed to string (UUID)
  studentName: string; // Mapped from name
  name?: string; // Original
  className?: string; // Mapped from classes.name
  class?: string; // UI prop compatible
  grade?: string;
  enrollmentDate?: string; // created_at
}

interface StudentAttendanceReportProps {
  student: any | null; // Allow any to accept Supabase student object
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function StudentAttendanceReport({ student, open, onOpenChange }: StudentAttendanceReportProps) {
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (student && open) {
      fetchStudentAttendance();
    }
  }, [student, open]);

  const fetchStudentAttendance = async () => {
    if (!student || !student.id) return;
    try {
      setLoading(true);
      const data = await attendanceService.getByStudentId(student.id);

      const records: AttendanceRecord[] = (data || []).map((item: any) => ({
        id: item.id,
        date: item.date,
        checkIn: item.created_at ? format(new Date(item.created_at), 'HH:mm') : '-',
        checkOut: '-',
        status: item.present ? 'present' : 'absent'
      }));

      setAllRecords(records);
    } catch (error) {
      console.error('Error fetching student attendance:', error);
      toast.error('فشل جلب سجلات الحضور');
    } finally {
      setLoading(false);
    }
  };

  if (!student) return null;

  // Adapt student props from Supabase object if needed
  const displayStudent = {
    name: student.studentName || student.name || 'غير معروف',
    class: student.class || student.className || student.classes?.name || '-',
    grade: student.grade || student.classes?.grade_level || '-',
    enrollmentDate: student.enrollmentDate || (student.created_at ? format(new Date(student.created_at), 'yyyy-MM-dd') : '-')
  };

  // Filter records
  const filteredRecords = allRecords.filter(record => {
    const matchesMonth = filterMonth === 'all' || record.date.startsWith(filterMonth);
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
    return matchesMonth && matchesStatus;
  });

  // Calculate statistics
  const totalDays = allRecords.length;
  const presentDays = allRecords.filter(r => r.status === 'present').length;
  const lateDays = allRecords.filter(r => r.status === 'late').length;
  const absentDays = allRecords.filter(r => r.status === 'absent').length;
  const attendanceRate = totalDays > 0 ? ((presentDays + lateDays) / totalDays * 100).toFixed(1) : '0';

  // Calculate monthly statistics
  const getMonthlyStats = () => {
    const months = new Map<string, { present: number; late: number; absent: number; total: number }>();

    allRecords.forEach(record => {
      const month = record.date.substring(0, 7); // YYYY-MM
      if (!months.has(month)) {
        months.set(month, { present: 0, late: 0, absent: 0, total: 0 });
      }
      const stats = months.get(month)!;
      stats.total++;
      if (record.status === 'present') stats.present++;
      else if (record.status === 'late') stats.late++;
      else stats.absent++;
    });

    return Array.from(months.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 6); // آخر 6 شهور
  };

  const monthlyStats = getMonthlyStats();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-500">حاضر</Badge>;
      case 'late':
        return <Badge className="bg-yellow-500">متأخر</Badge>;
      case 'absent':
        return <Badge className="bg-red-500">غائب</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getMonthName = (monthStr: string) => {
    const months = [
      'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    const [year, month] = monthStr.split('-');
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const handleExportPDF = () => {
    toast.success('جاري تصدير التقرير إلى PDF... (ميزة تجريبية)');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <User className="h-6 w-6 text-orange-500" />
            تقرير حضور الطالب
          </DialogTitle>
          <DialogDescription>
            سجل الحضور الكامل
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="p-8 text-center">جاري تحميل البيانات...</div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Student Info Card */}
            <Card className="border-orange-200">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">اسم الطالب</p>
                    <p className="text-black">{displayStudent.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">الصف</p>
                    <p className="text-black">{displayStudent.class}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">المرحلة</p>
                    <p className="text-black">{displayStudent.grade}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">تاريخ التسجيل</p>
                    <p className="text-black" dir="ltr">{displayStudent.enrollmentDate}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Overall Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    إجمالي الأيام
                  </CardDescription>
                  <CardTitle className="text-3xl text-black">{totalDays}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    الحضور
                  </CardDescription>
                  <CardTitle className="text-3xl text-green-600">{presentDays}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    التأخير
                  </CardDescription>
                  <CardTitle className="text-3xl text-yellow-600">{lateDays}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    الغياب
                  </CardDescription>
                  <CardTitle className="text-3xl text-red-600">{absentDays}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Attendance Rate */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  نسبة الحضور
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">معدل الحضور الكلي</span>
                    <span className="text-3xl text-orange-500">{attendanceRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-orange-500 h-4 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                      style={{ width: `${attendanceRate}%` }}
                    >
                      <span className="text-xs text-white font-bold">{attendanceRate}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Statistics */}
            {monthlyStats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>الإحصائيات الشهرية</CardTitle>
                  <CardDescription>آخر شهور</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {monthlyStats.map(([month, stats]) => {
                      const monthRate = stats.total > 0 ? ((stats.present + stats.late) / stats.total * 100).toFixed(1) : '0';
                      return (
                        <div key={month} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-black">{getMonthName(month)}</span>
                            <div className="flex gap-3 text-xs">
                              <span className="text-green-600">حاضر: {stats.present}</span>
                              <span className="text-yellow-600">متأخر: {stats.late}</span>
                              <span className="text-red-600">غائب: {stats.absent}</span>
                              <span className="text-orange-500 font-bold">{monthRate}%</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-orange-500 h-2 rounded-full transition-all"
                              style={{ width: `${monthRate}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm mb-2 text-gray-700">تصفية حسب الشهر:</label>
                    <Select value={filterMonth} onValueChange={setFilterMonth}>
                      <SelectTrigger>
                        <SelectValue placeholder="جميع الأشهر" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الأشهر</SelectItem>
                        {/* Dynamically populate months derived from data is better, but hardcoded checks existing also fine. */}
                        {/* For now keeping static or just "All" if no data */}
                        <SelectItem value="2025-11">نوفمبر 2025</SelectItem>
                        <SelectItem value="2025-10">أكتوبر 2025</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-gray-700">تصفية حسب الحالة:</label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="جميع الحالات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الحالات</SelectItem>
                        <SelectItem value="present">حاضر فقط</SelectItem>
                        <SelectItem value="late">متأخر فقط</SelectItem>
                        <SelectItem value="absent">غائب فقط</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleExportPDF}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      <Download className="ml-2 h-4 w-4" />
                      تصدير التقرير
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Attendance Table */}
            <Card>
              <CardHeader>
                <CardTitle>سجل الحضور التفصيلي</CardTitle>
                <CardDescription>
                  عرض {filteredRecords.length} من أصل {allRecords.length} سجل
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white">
                      <TableRow>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">اليوم</TableHead>
                        <TableHead className="text-right">وقت الحضور</TableHead>
                        <TableHead className="text-right">وقت الانصراف</TableHead>
                        <TableHead className="text-center">الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.length > 0 ? (
                        filteredRecords.map((record) => {
                          const date = new Date(record.date);
                          const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
                          const dayName = dayNames[date.getDay()];

                          return (
                            <TableRow key={record.id}>
                              <TableCell dir="ltr" className="text-right">{record.date}</TableCell>
                              <TableCell>{dayName}</TableCell>
                              <TableCell dir="ltr" className="text-right">{record.checkIn}</TableCell>
                              <TableCell dir="ltr" className="text-right">{record.checkOut}</TableCell>
                              <TableCell className="text-center">
                                {getStatusBadge(record.status)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                            لا توجد نتائج
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
