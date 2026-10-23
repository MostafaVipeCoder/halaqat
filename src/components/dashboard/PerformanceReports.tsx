import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
    ShieldAlert,
    AlertTriangle,
    UserMinus,
    MessageSquare,
    Search,
    Filter,
    Download,
    TrendingUp,
    Calendar,
    Users
} from 'lucide-react';
import { useSuspensions } from '../../hooks/useSuspensions';
import { useAttendance } from '../../hooks/useAttendance';
import { useStudents } from '../../hooks/useStudents';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line
} from 'recharts';
import { format, subDays, isAfter } from 'date-fns';
import { toast } from 'sonner';

const BEHAVIOR_COLORS = {
    warning: '#fb923c', // Orange 400
    suspension: '#ef4444', // Red 500
    expulsion: '#7f1d1d', // Red 900
    parent_notification: '#3b82f6', // Blue 500
};

export default function PerformanceReports() {
    const { suspensions, isLoading: isSuspensionsLoading } = useSuspensions();
    const { attendance, isLoading: isAttendanceLoading } = useAttendance();
    const { students } = useStudents();

    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'warning' | 'suspension' | 'expulsion' | 'parent_notification'>('all');

    // Aggregate Stats
    const stats = useMemo(() => {
        const counts = {
            warning: suspensions.filter(s => s.type === 'warning').length,
            suspension: suspensions.filter(s => s.type === 'suspension').length,
            expulsion: suspensions.filter(s => s.type === 'expulsion').length,
            parent_notification: suspensions.filter(s => s.type === 'parent_notification').length,
        };

        const totalAttendance = attendance.length;
        const presentCount = attendance.filter(a => a.present).length;
        const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

        return { ...counts, attendanceRate };
    }, [suspensions, attendance]);

    // Trend Data (Last 30 days)
    const trendData = useMemo(() => {
        const last30Days = Array.from({ length: 30 }, (_, i) => {
            const date = subDays(new Date(), i);
            return format(date, 'yyyy-MM-dd');
        }).reverse();

        return last30Days.map(date => {
            const dayIncidents = suspensions.filter(s => format(new Date(s.created_at || ''), 'yyyy-MM-dd') === date);
            return {
                date: format(new Date(date), 'MM/dd'),
                warnings: dayIncidents.filter(s => s.type === 'warning').length,
                suspensions: dayIncidents.filter(s => s.type === 'suspension').length,
                expulsions: dayIncidents.filter(s => s.type === 'expulsion').length,
            };
        });
    }, [suspensions]);

    // Behavior Distribution Data
    const distributionData = useMemo(() => [
        { name: 'إنذار', value: stats.warning, color: BEHAVIOR_COLORS.warning },
        { name: 'إيقاف مؤقت', value: stats.suspension, color: BEHAVIOR_COLORS.suspension },
        { name: 'فصل نهائي', value: stats.expulsion, color: BEHAVIOR_COLORS.expulsion },
        { name: 'إخطار ولي أمر', value: stats.parent_notification, color: BEHAVIOR_COLORS.parent_notification },
    ].filter(d => d.value > 0), [stats]);

    // Filtered Log
    const filteredLog = useMemo(() => {
        return suspensions.filter(s => {
            const studentName = (s.students as any)?.name || '';
            const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = typeFilter === 'all' || s.type === typeFilter;
            return matchesSearch && matchesType;
        });
    }, [suspensions, searchTerm, typeFilter]);

    const handleExport = () => {
        toast.success('جاري تصدير تقرير الأداء... (PDF)');
    };

    if (isSuspensionsLoading || isAttendanceLoading) {
        return <div className="p-8 text-center bg-white min-h-screen font-bold">جاري تحميل بيانات الأداء...</div>;
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">تقارير الأداء السلوكي</h1>
                    <p className="text-gray-500">تحليل مستوى الانضباط والحضور للطلاب</p>
                </div>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white font-medium" onClick={handleExport}>
                    <Download className="ml-2 h-4 w-4" />
                    تصدير التقرير الكامل
                </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="p-2 bg-orange-100 w-fit rounded-lg mb-4">
                            <Calendar className="h-5 w-5 text-orange-600" />
                        </div>
                        <p className="text-sm text-gray-500">نسبة الحضور</p>
                        <h3 className="text-2xl font-bold text-gray-900">{stats.attendanceRate.toFixed(1)}%</h3>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="p-2 bg-yellow-100 w-fit rounded-lg mb-4">
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        </div>
                        <p className="text-sm text-gray-500">الإنذارات</p>
                        <h3 className="text-2xl font-bold text-gray-900">{stats.warning}</h3>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="p-2 bg-red-100 w-fit rounded-lg mb-4">
                            <UserMinus className="h-5 w-5 text-red-600" />
                        </div>
                        <p className="text-sm text-gray-500">الإيقاف المؤقت</p>
                        <h3 className="text-2xl font-bold text-gray-900">{stats.suspension}</h3>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="p-2 bg-red-900 bg-opacity-10 w-fit rounded-lg mb-4">
                            <ShieldAlert className="h-5 w-5 text-red-900" />
                        </div>
                        <p className="text-sm text-gray-500">الفصل النهائي</p>
                        <h3 className="text-2xl font-bold text-gray-900">{stats.expulsion}</h3>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="p-2 bg-blue-100 w-fit rounded-lg mb-4">
                            <MessageSquare className="h-5 w-5 text-blue-600" />
                        </div>
                        <p className="text-sm text-gray-500">إخطار الوالدين</p>
                        <h3 className="text-2xl font-bold text-gray-900">{stats.parent_notification}</h3>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 text-black">
                            <TrendingUp className="h-5 w-5 text-orange-500" />
                            تحليل التوجهات السلوكية
                        </CardTitle>
                        <CardDescription>عدد الحالات السلوكية خلال الـ 30 يوماً الماضية</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="date" stroke="#6b7280" fontSize={10} axisLine={false} tickLine={false} />
                                    <YAxis stroke="#6b7280" fontSize={10} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="warnings" name="إنذارات" fill={BEHAVIOR_COLORS.warning} radius={[2, 2, 0, 0]} stackId="a" />
                                    <Bar dataKey="suspensions" name="إيقاف مؤقت" fill={BEHAVIOR_COLORS.suspension} radius={[2, 2, 0, 0]} stackId="a" />
                                    <Bar dataKey="expulsions" name="فصل نهائي" fill={BEHAVIOR_COLORS.expulsion} radius={[2, 2, 0, 0]} stackId="a" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 text-black">
                            <Users className="h-5 w-5 text-orange-500" />
                            توزيع أنواع المخالفات
                        </CardTitle>
                        <CardDescription>النسب المئوية لأنواع الإجراءات الإدارية</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center pt-4">
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={distributionData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {distributionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-4">
                            {distributionData.map((entry) => (
                                <div key={entry.name} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                    <span className="text-xs text-gray-600">{entry.name}: {entry.value}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Incident Log Table */}
            <Card className="bg-white border-0 shadow-sm">
                <CardHeader className="border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <CardTitle className="text-lg text-black">سجل المخالفات التفصيلي</CardTitle>
                        <CardDescription>جميع الإجراءات الإدارية المسجلة ضد الطلاب</CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="ابحث باسم الطالب..."
                                className="pr-10 bg-gray-50 border-0 focus-visible:ring-orange-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                            <SelectTrigger className="w-full md:w-40 bg-gray-50 border-0">
                                <Filter className="h-4 w-4 ml-2" />
                                <SelectValue placeholder="نوع الإجراء" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">كل الإجراءات</SelectItem>
                                <SelectItem value="warning">إنذار</SelectItem>
                                <SelectItem value="suspension">إيقاف مؤقت</SelectItem>
                                <SelectItem value="expulsion">فصل نهائي</SelectItem>
                                <SelectItem value="parent_notification">إخطار ولي أمر</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead className="text-right">التاريخ</TableHead>
                                <TableHead className="text-right">اسم الطالب</TableHead>
                                <TableHead className="text-right">الحلقة</TableHead>
                                <TableHead className="text-right">نوع الإجراء</TableHead>
                                <TableHead className="text-right">السبب</TableHead>
                                <TableHead className="text-right">المدة</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLog.length > 0 ? (
                                filteredLog.map((log) => (
                                    <TableRow key={log.id} className="hover:bg-gray-50">
                                        <TableCell className="text-gray-500 text-sm" dir="ltr">
                                            {log.created_at ? format(new Date(log.created_at), 'yyyy-MM-dd') : '-'}
                                        </TableCell>
                                        <TableCell className="font-medium text-gray-900">{(log.students as any)?.name || '-'}</TableCell>
                                        <TableCell>{(log.students as any)?.classes?.name || '-'}</TableCell>
                                        <TableCell>
                                            {log.type === 'warning' && <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-0">إنذار</Badge>}
                                            {log.type === 'suspension' && <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0">إيقاف مؤقت</Badge>}
                                            {log.type === 'expulsion' && <Badge className="bg-red-900 text-white hover:bg-red-900 border-0">فصل نهائي</Badge>}
                                            {log.type === 'parent_notification' && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0">إخطار ولي أمر</Badge>}
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate text-gray-600" title={log.reason}>
                                            {log.reason}
                                        </TableCell>
                                        <TableCell>{log.duration_days ? `${log.duration_days} يوم` : '-'}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-48 text-center text-gray-400">
                                        لا توجد بيانات تطابق البحث
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
