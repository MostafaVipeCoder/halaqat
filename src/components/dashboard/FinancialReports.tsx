import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    Download,
    Search,
    Filter,
    ArrowUpRight,
    ArrowDownRight,
    Wallet,
    PieChart as PieChartIcon,
    BarChart3
} from 'lucide-react';
import { usePayments } from '../../hooks/usePayments';
import { useStudents } from '../../hooks/useStudents';
import { useClasses } from '../../hooks/useClasses';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { format } from 'date-fns';
import { toast } from 'sonner';

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'];

export default function FinancialReports() {
    const { payments, stats, isLoading: isPaymentsLoading } = usePayments();
    const { students, isLoading: isStudentsLoading } = useStudents();
    const { classes, isLoading: isClassesLoading } = useClasses();

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');

    // Data for Monthly Revenue Chart
    const monthlyRevenueData = useMemo(() => {
        const monthNames = [
            'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];

        const dataMap: Record<string, number> = {};

        payments.forEach(p => {
            if (p.status === 'paid') {
                const month = p.month;
                dataMap[month] = (dataMap[month] || 0) + Number(p.amount);
            }
        });

        return monthNames.map(name => ({
            name,
            revenue: dataMap[name] || 0
        })).filter(d => d.revenue > 0);
    }, [payments]);

    // Data for Status Chart
    const statusData = useMemo(() => {
        const counts = {
            paid: payments.filter(p => p.status === 'paid').length,
            unpaid: payments.filter(p => p.status === 'unpaid').length,
            partial: payments.filter(p => p.status === 'partial').length,
        };

        return [
            { name: 'محصل', value: counts.paid },
            { name: 'غير محصل', value: counts.unpaid },
            { name: 'محصل جزئي', value: counts.partial },
        ].filter(d => d.value > 0);
    }, [payments]);

    // Filtered Transactions
    const filteredPayments = useMemo(() => {
        return payments.filter(p => {
            const studentName = (p.students as any)?.name || '';
            const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [payments, searchTerm, statusFilter]);

    const handleExport = (type: 'pdf' | 'csv') => {
        toast.success(`جاري تصدير التقرير بصيغة ${type.toUpperCase()}...`);
    };

    if (isPaymentsLoading || isStudentsLoading || isClassesLoading) {
        return <div className="p-8 text-center bg-white min-h-screen">جاري تحميل البيانات المالية...</div>;
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">التقارير المالية</h1>
                    <p className="text-gray-500">نظرة شاملة على الإيرادات والتحصيلات المالية للمدرسة</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleExport('csv')}>
                        <Download className="ml-2 h-4 w-4" />
                        تصدير Excel
                    </Button>
                    <Button className="bg-orange-500 hover:bg-orange-600 text-white font-medium" onClick={() => handleExport('pdf')}>
                        <Download className="ml-2 h-4 w-4" />
                        تقرير PDF
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white border-0 shadow-sm overflow-hidden group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                                <Wallet className="h-5 w-5 text-orange-600" />
                            </div>
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                <ArrowUpRight className="h-3 w-3 ml-1" />
                                {stats?.collectionRate.toFixed(1)}%
                            </Badge>
                        </div>
                        <p className="text-sm text-gray-500">إجمالي المستحق</p>
                        <h3 className="text-2xl font-bold text-gray-900">{stats?.totalAmount.toLocaleString()} ج.م</h3>
                    </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-sm overflow-hidden group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                                <DollarSign className="h-5 w-5 text-green-600" />
                            </div>
                        </div>
                        <p className="text-sm text-gray-500">المبلغ المحصل</p>
                        <h3 className="text-2xl font-bold text-gray-900 text-green-600">{stats?.collectedAmount.toLocaleString()} ج.م</h3>
                    </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-sm overflow-hidden group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                                <TrendingDown className="h-5 w-5 text-red-600" />
                            </div>
                        </div>
                        <p className="text-sm text-gray-500">المبالغ المتأخرة</p>
                        <h3 className="text-2xl font-bold text-gray-900 text-red-600">{stats?.pendingAmount.toLocaleString()} ج.م</h3>
                    </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-sm overflow-hidden group">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                                <BarChart3 className="h-5 w-5 text-blue-600" />
                            </div>
                        </div>
                        <p className="text-sm text-gray-500">عدد المعاملات</p>
                        <h3 className="text-2xl font-bold text-gray-900">{payments.length} معاملة</h3>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-orange-500" />
                            اتجاه تحصيل الإيرادات
                        </CardTitle>
                        <CardDescription>الدخل الشهري المحصل فعلياً لهذا العام</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyRevenueData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <PieChartIcon className="h-5 w-5 text-orange-500" />
                            توزيع حالات الدفع
                        </CardTitle>
                        <CardDescription>نسبة المحصل مقابل المبالغ المتأخرة</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center items-center h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-col gap-2 mr-8">
                            {statusData.map((entry, index) => (
                                <div key={entry.name} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                    <span className="text-sm text-gray-600">{entry.name}: {entry.value}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Table */}
            <Card className="bg-white border-0 shadow-sm overflow-hidden">
                <CardHeader className="border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <CardTitle className="text-lg">تفاصيل العمليات المالية</CardTitle>
                        <CardDescription>قائمة بجميع المدفوعات المسجلة في النظام</CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="البحث باسم الطالب..."
                                className="pr-10 bg-gray-50 border-0 focus-visible:ring-orange-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                            <SelectTrigger className="w-full md:w-32 bg-gray-50 border-0">
                                <Filter className="h-4 w-4 ml-2" />
                                <SelectValue placeholder="الحالة" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">الكل</SelectItem>
                                <SelectItem value="paid">محصل</SelectItem>
                                <SelectItem value="unpaid">غير محصل</SelectItem>
                                <SelectItem value="partial">جزئي</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead className="text-right">اسم الطالب</TableHead>
                                <TableHead className="text-right">الحلقة</TableHead>
                                <TableHead className="text-right">الشهر</TableHead>
                                <TableHead className="text-right text-orange-600">المبلغ</TableHead>
                                <TableHead className="text-right">تاريخ الدفع</TableHead>
                                <TableHead className="text-center">الحالة</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPayments.length > 0 ? (
                                filteredPayments.map((payment) => (
                                    <TableRow key={payment.id} className="hover:bg-gray-50 transition-colors">
                                        <TableCell className="font-medium text-gray-900">{(payment.students as any)?.name || '-'}</TableCell>
                                        <TableCell className="text-gray-600">
                                            {classes.find(c => c.id === (payment.students as any)?.class_id)?.name || '-'}
                                        </TableCell>
                                        <TableCell>{payment.month}</TableCell>
                                        <TableCell className="font-bold">{payment.amount.toLocaleString()} ج.م</TableCell>
                                        <TableCell className="text-gray-500" dir="ltr">
                                            {payment.payment_date ? format(new Date(payment.payment_date), 'yyyy-MM-dd') : '-'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {payment.status === 'paid' ? (
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-0">محصل</Badge>
                                            ) : payment.status === 'partial' ? (
                                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0">جزئي</Badge>
                                            ) : (
                                                <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-0">متأخر</Badge>
                                            )}
                                        </TableCell>
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

// Sub-components as needed or move to separate files if they grow
