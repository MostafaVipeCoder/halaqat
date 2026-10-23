import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { BookOpen, BookOpenCheck, CheckCircle2, Plus, RotateCcw, Search, Trash2, Users } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import KPICard from './KPICard';
import RecitationSessionDialog from './memorization/RecitationSessionDialog';
import { RECITATION_GRADES, RECITATION_TYPES, gradeMeta, typeMeta } from './memorization/labels';
import { useRecitationSessions } from '../../hooks/useMemorization';
import { useStudents } from '../../hooks/useStudents';
import { useClasses } from '../../hooks/useClasses';
import { formatRange } from '../../lib/quran';
import type { RecitationSession } from '../../types';

const RANGE_OPTIONS = [
    { value: '7', label: 'آخر 7 أيام' },
    { value: '30', label: 'آخر 30 يوم' },
    { value: '90', label: 'آخر 3 أشهر' },
];

export default function Recitations() {
    const today = format(new Date(), 'yyyy-MM-dd');
    const [rangeDays, setRangeDays] = useState('30');
    const fromDate = format(subDays(new Date(), Number(rangeDays)), 'yyyy-MM-dd');

    const { sessions, isLoading, addSession, isAdding, deleteSession } = useRecitationSessions({ fromDate });
    const { students: rawStudents, isLoading: isStudentsLoading } = useStudents();
    const { classes } = useClasses();

    const students = useMemo(
        () => rawStudents.filter(s => s.status !== 'expelled' && s.id) as { id: string; name: string; class_id?: string; status?: string }[],
        [rawStudents]
    );

    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogStudentId, setDialogStudentId] = useState<string | undefined>();

    // حلقة اليوم
    const [todayClass, setTodayClass] = useState('all');

    // سجل التسميع
    const [searchTerm, setSearchTerm] = useState('');
    const [filterClass, setFilterClass] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [filterGrade, setFilterGrade] = useState('all');

    const todaySessions = useMemo(() => sessions.filter(s => s.session_date === today), [sessions, today]);

    const stats = useMemo(() => {
        const recitedToday = new Set(todaySessions.map(s => s.student_id));
        const newPagesToday = todaySessions
            .filter(s => s.type === 'new' && s.grade !== 'repeat')
            .reduce((sum, s) => sum + Number(s.pages), 0);
        const repeatRate = sessions.length > 0
            ? Math.round((sessions.filter(s => s.grade === 'repeat').length / sessions.length) * 100)
            : 0;
        return {
            todayCount: todaySessions.length,
            recitedToday: recitedToday.size,
            newPagesToday: Math.round(newPagesToday * 100) / 100,
            repeatRate,
        };
    }, [sessions, todaySessions]);

    const rosterStudents = useMemo(
        () => students.filter(s => s.status !== 'suspended' && (todayClass === 'all' || s.class_id === todayClass)),
        [students, todayClass]
    );

    const todayByStudent = useMemo(() => {
        const map = new Map<string, RecitationSession[]>();
        for (const s of todaySessions) map.set(s.student_id, [...(map.get(s.student_id) || []), s]);
        return map;
    }, [todaySessions]);

    const filteredSessions = sessions.filter(s => {
        const name = s.students?.name || '';
        return name.toLowerCase().includes(searchTerm.toLowerCase())
            && (filterClass === 'all' || s.class_id === filterClass || s.students?.class_id === filterClass)
            && (filterType === 'all' || s.type === filterType)
            && (filterGrade === 'all' || s.grade === filterGrade);
    });

    const openDialog = (studentId?: string) => {
        setDialogStudentId(studentId);
        setDialogOpen(true);
    };

    const handleDelete = async (session: RecitationSession) => {
        if (!window.confirm(`حذف تسميع ${session.students?.name || ''} بتاريخ ${session.session_date}؟`)) return;
        await deleteSession(session.id);
    };

    return (
        <div className="mz space-y-6" dir="rtl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">الحفظ والتسميع</h1>
                    <p className="text-gray-500 mt-1">متابعة تسميع الطلاب اليومي والحفظ الجديد والمراجعة</p>
                </div>
                <Button onClick={() => openDialog()} className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Plus className="h-4 w-4 ml-2" />
                    تسجيل تسميع
                </Button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <KPICard label="تسميعات اليوم" value={stats.todayCount} icon={BookOpen} color="orange" />
                <KPICard label="طلاب سمّعوا اليوم" value={`${stats.recitedToday} من ${students.length}`} icon={Users} color="blue" />
                <KPICard label="صفحات حفظ جديد اليوم" value={stats.newPagesToday} icon={BookOpenCheck} color="green" />
                <KPICard label="نسبة الإعادة" value={stats.repeatRate} suffix="%" icon={RotateCcw} color="red" />
            </div>

            <Tabs defaultValue="today" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-white border p-1 h-auto">
                    <TabsTrigger value="today" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 py-2.5">
                        حلقة اليوم
                    </TabsTrigger>
                    <TabsTrigger value="log" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 py-2.5">
                        سجل التسميع
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="today">
                    <Card>
                        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <CardTitle>كشف تسميع اليوم</CardTitle>
                                <CardDescription>{format(new Date(), 'EEEE d MMMM yyyy', { locale: ar })}</CardDescription>
                            </div>
                            <Select value={todayClass} onValueChange={setTodayClass}>
                                <SelectTrigger className="w-full sm:w-56" aria-label="الحلقة">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">كل الحلقات</SelectItem>
                                    {classes.map((c: any) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CardHeader>
                        <CardContent>
                            {isStudentsLoading || isLoading ? (
                                <div className="flex justify-center py-12">
                                    <div className="h-8 w-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                                </div>
                            ) : rosterStudents.length === 0 ? (
                                <p className="text-center text-gray-500 py-12">لا يوجد طلاب في هذه الحلقة</p>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {rosterStudents.map(student => {
                                        const recited = todayByStudent.get(student.id) || [];
                                        return (
                                            <div key={student.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {recited.length > 0 ? (
                                                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                                    ) : (
                                                        <div className="h-5 w-5 rounded-full border-2 border-gray-300 shrink-0" />
                                                    )}
                                                    <div className="min-w-0">
                                                        <Link to={`/dashboard/students/${student.id}`} className="font-medium text-gray-900 hover:text-orange-600">
                                                            {student.name}
                                                        </Link>
                                                        {recited.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                                {recited.map(r => (
                                                                    <Badge key={r.id} variant="outline" className={gradeMeta(r.grade).className}>
                                                                        {typeMeta(r.type).label}: {formatRange({ surah: r.from_surah, ayah: r.from_ayah }, { surah: r.to_surah, ayah: r.to_ayah })} — {gradeMeta(r.grade).label}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-gray-500 mt-0.5">لم يسمّع بعد</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button size="sm" variant={recited.length ? 'outline' : 'default'} onClick={() => openDialog(student.id)}
                                                    className={recited.length ? '' : 'bg-orange-500 hover:bg-orange-600 text-white'}>
                                                    <Plus className="h-4 w-4 ml-1" />
                                                    {recited.length ? 'تسميع آخر' : 'سجّل التسميع'}
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="log">
                    <Card>
                        <CardHeader>
                            <CardTitle>سجل التسميع</CardTitle>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
                                <div className="relative lg:col-span-1">
                                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                    <Input placeholder="بحث باسم الطالب" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-9" />
                                </div>
                                <Select value={filterClass} onValueChange={setFilterClass}>
                                    <SelectTrigger aria-label="الحلقة"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">كل الحلقات</SelectItem>
                                        {classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={filterType} onValueChange={setFilterType}>
                                    <SelectTrigger aria-label="نوع التسميع"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">كل الأنواع</SelectItem>
                                        {RECITATION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={filterGrade} onValueChange={setFilterGrade}>
                                    <SelectTrigger aria-label="التقدير"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">كل التقديرات</SelectItem>
                                        {RECITATION_GRADES.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={rangeDays} onValueChange={setRangeDays}>
                                    <SelectTrigger aria-label="الفترة"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {RANGE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center py-12">
                                    <div className="h-8 w-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                                </div>
                            ) : filteredSessions.length === 0 ? (
                                <p className="text-center text-gray-500 py-12">لا توجد جلسات تسميع في هذه الفترة</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-right">التاريخ</TableHead>
                                                <TableHead className="text-right">الطالب</TableHead>
                                                <TableHead className="text-right">النوع</TableHead>
                                                <TableHead className="text-right">المقطع</TableHead>
                                                <TableHead className="text-right">الصفحات</TableHead>
                                                <TableHead className="text-right">الأخطاء (حفظ/تشكيل/تجويد)</TableHead>
                                                <TableHead className="text-right">التقدير</TableHead>
                                                <TableHead className="text-right"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredSessions.map(s => (
                                                <TableRow key={s.id}>
                                                    <TableCell className="whitespace-nowrap">{s.session_date}</TableCell>
                                                    <TableCell>
                                                        <Link to={`/dashboard/students/${s.student_id}`} className="font-medium hover:text-orange-600">
                                                            {s.students?.name || '-'}
                                                        </Link>
                                                        <div className="text-xs text-gray-500">{s.students?.classes?.name || ''}</div>
                                                    </TableCell>
                                                    <TableCell><Badge variant="outline" className={typeMeta(s.type).className}>{typeMeta(s.type).label}</Badge></TableCell>
                                                    <TableCell className="whitespace-nowrap">
                                                        {formatRange({ surah: s.from_surah, ayah: s.from_ayah }, { surah: s.to_surah, ayah: s.to_ayah })}
                                                    </TableCell>
                                                    <TableCell>{Number(s.pages)}</TableCell>
                                                    <TableCell>{s.memorization_errors} / {s.tashkeel_errors} / {s.tajweed_errors}</TableCell>
                                                    <TableCell><Badge variant="outline" className={gradeMeta(s.grade).className}>{gradeMeta(s.grade).label}</Badge></TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(s)} aria-label="حذف">
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <RecitationSessionDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                students={students}
                fixedStudentId={dialogStudentId}
                onSubmit={addSession}
                isSubmitting={isAdding}
            />
        </div>
    );
}
