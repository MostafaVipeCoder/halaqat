import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import { AlertTriangle, BookOpenCheck, ChevronDown, ChevronUp, GraduationCap, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import KPICard from '../KPICard';
import { countsAsMemorized } from '../memorization/labels';
import { countNoun, SESSIONS } from '../../../lib/arabicPlural';
import { useRecitationSessions } from '../../../hooks/useMemorization';
import { useStudents } from '../../../hooks/useStudents';
import { useClasses } from '../../../hooks/useClasses';
import { useAttendance } from '../../../hooks/useAttendance';
import { useStaff } from '../../../hooks/useStaff';
import type { RecitationGrade, RecitationSession } from '../../../types';

const GRADE_SCORE: Record<RecitationGrade, number> = { excellent: 5, very_good: 4, good: 3, acceptable: 2, repeat: 1 };
const scoreLabel = (s: number) => s >= 4.5 ? 'ممتاز' : s >= 3.5 ? 'جيد جدًا' : s >= 2.5 ? 'جيد' : s >= 1.5 ? 'مقبول' : 'ضعيف';

const PERIODS = [
    { value: '7', label: 'آخر 7 أيام' },
    { value: '30', label: 'آخر 30 يوم' },
    { value: '90', label: 'آخر 3 أشهر' },
];

interface StudentRow {
    id: string;
    name: string;
    halaqa: string;
    sessions: number;
    newPages: number;
    avgScore: number | null;
    lastDate: string | null;
}

interface TeacherRow {
    key: string;
    name: string;
    halaqat: string[];
    students: StudentRow[];
    sessions: number;
    newPages: number;
    reviewPages: number;
    avgScore: number | null;
    repeatRate: number;
    attendanceRate: number | null;
    inactiveStudents: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export default function TeacherReports() {
    const [period, setPeriod] = useState('30');
    const [expanded, setExpanded] = useState<string | null>(null);
    const fromDate = format(subDays(new Date(), Number(period)), 'yyyy-MM-dd');
    const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

    const { sessions, isLoading } = useRecitationSessions({ fromDate });
    const { students } = useStudents();
    const { classes } = useClasses();
    const { attendance } = useAttendance();
    const { staff } = useStaff();

    const rows = useMemo<TeacherRow[]>(() => {
        const byStudent = new Map<string, RecitationSession[]>();
        for (const s of sessions) byStudent.set(s.student_id, [...(byStudent.get(s.student_id) || []), s]);

        const teacherOfClass = (c: any) => ({
            key: c.teacher_id ?? (c.teacher_name ? `name:${c.teacher_name}` : 'none'),
            name: staff.find(t => t.id === c.teacher_id)?.full_name ?? c.teacher_name ?? 'حلقات بدون معلم',
        });

        const groups = new Map<string, TeacherRow>();
        for (const c of classes as any[]) {
            const t = teacherOfClass(c);
            const row: TeacherRow = groups.get(t.key) ?? {
                key: t.key, name: t.name, halaqat: [], students: [], sessions: 0, newPages: 0, reviewPages: 0,
                avgScore: null, repeatRate: 0, attendanceRate: null, inactiveStudents: 0,
            };
            row.halaqat.push(c.name);
            for (const st of (students as any[]).filter(s => s.class_id === c.id && s.status !== 'expelled')) {
                const ss = byStudent.get(st.id) || [];
                const graded = ss.filter(x => x.type === 'new');
                row.students.push({
                    id: st.id,
                    name: st.name,
                    halaqa: c.name,
                    sessions: ss.length,
                    newPages: round1(ss.filter(countsAsMemorized).reduce((sum, x) => sum + Number(x.pages), 0)),
                    avgScore: graded.length ? graded.reduce((sum, x) => sum + GRADE_SCORE[x.grade], 0) / graded.length : null,
                    lastDate: ss[0]?.session_date ?? null,
                });
            }
            groups.set(t.key, row);
        }

        const inPeriod = attendance.filter((a: any) => a.date >= fromDate);
        for (const row of groups.values()) {
            const ids = new Set(row.students.map(s => s.id));
            const all = row.students.flatMap(s => byStudent.get(s.id) || []);
            const graded = all.filter(x => x.type === 'new');
            row.sessions = all.length;
            row.newPages = round1(all.filter(countsAsMemorized).reduce((sum, x) => sum + Number(x.pages), 0));
            row.reviewPages = round1(all.filter(x => x.type !== 'new').reduce((sum, x) => sum + Number(x.pages), 0));
            row.avgScore = graded.length ? graded.reduce((sum, x) => sum + GRADE_SCORE[x.grade], 0) / graded.length : null;
            row.repeatRate = graded.length ? Math.round((graded.filter(x => x.grade === 'repeat').length / graded.length) * 100) : 0;
            const att = inPeriod.filter((a: any) => ids.has(a.student_id));
            row.attendanceRate = att.length ? Math.round((att.filter((a: any) => a.present).length / att.length) * 100) : null;
            row.inactiveStudents = row.students.filter(s => !s.lastDate || s.lastDate < weekAgo).length;
            row.students.sort((a, b) => b.newPages - a.newPages);
        }
        return [...groups.values()].sort((a, b) => b.newPages - a.newPages);
    }, [sessions, students, classes, attendance, staff, fromDate, weekAgo]);

    const totals = useMemo(() => ({
        teachers: rows.filter(r => r.key !== 'none').length,
        students: rows.reduce((s, r) => s + r.students.length, 0),
        newPages: round1(rows.reduce((s, r) => s + r.newPages, 0)),
        inactive: rows.reduce((s, r) => s + r.inactiveStudents, 0),
    }), [rows]);

    return (
        <div className="mz space-y-6" dir="rtl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">تقارير المعلمين</h1>
                    <p className="text-gray-600 mt-1">إنجاز طلاب كل معلم في الحفظ والمراجعة والحضور</p>
                </div>
                <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-full sm:w-48" aria-label="الفترة"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <KPICard label="المعلمون" value={totals.teachers} icon={GraduationCap} color="orange" />
                <KPICard label="الطلاب" value={totals.students} icon={Users} color="blue" />
                <KPICard label="صفحات حفظ جديد" value={totals.newPages} icon={BookOpenCheck} color="green" />
                <KPICard label="لم يسمّعوا منذ أسبوع" value={totals.inactive} icon={AlertTriangle} color="red" />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">مقارنة المعلمين</CardTitle>
                    <CardDescription>اضغط على المعلم لعرض إنجاز كل طالب عنده</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="h-8 w-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                        </div>
                    ) : rows.length === 0 ? (
                        <p className="text-center text-gray-500 py-12">لا توجد حلقات بعد.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-right">المعلم</TableHead>
                                        <TableHead className="text-right">الطلاب</TableHead>
                                        <TableHead className="text-right">جلسات التسميع</TableHead>
                                        <TableHead className="text-right">صفحات جديدة</TableHead>
                                        <TableHead className="text-right">صفحات مراجعة</TableHead>
                                        <TableHead className="text-right">متوسط التقدير</TableHead>
                                        <TableHead className="text-right">نسبة الإعادة</TableHead>
                                        <TableHead className="text-right">الحضور</TableHead>
                                        <TableHead className="text-right">بحاجة لمتابعة</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map(row => (
                                        <Fragment key={row.key}>
                                            <TableRow className="cursor-pointer" onClick={() => setExpanded(expanded === row.key ? null : row.key)}>
                                                <TableCell>
                                                    <span className="flex items-center gap-1 font-medium text-gray-900">
                                                        {expanded === row.key ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                        {row.name}
                                                    </span>
                                                    <span className="text-xs text-gray-500">{row.halaqat.join('، ')}</span>
                                                </TableCell>
                                                <TableCell>{row.students.length}</TableCell>
                                                <TableCell>{row.sessions}</TableCell>
                                                <TableCell className="font-semibold">{row.newPages}</TableCell>
                                                <TableCell>{row.reviewPages}</TableCell>
                                                <TableCell>{row.avgScore === null ? '-' : scoreLabel(row.avgScore)}</TableCell>
                                                <TableCell>{row.repeatRate}%</TableCell>
                                                <TableCell>{row.attendanceRate === null ? '-' : `${row.attendanceRate}%`}</TableCell>
                                                <TableCell>
                                                    {row.inactiveStudents > 0
                                                        ? <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{row.inactiveStudents}</Badge>
                                                        : <span className="text-gray-500">0</span>}
                                                </TableCell>
                                            </TableRow>
                                            {expanded === row.key && (
                                                <TableRow>
                                                    <TableCell colSpan={9} className="bg-gray-50">
                                                        {row.students.length === 0 ? (
                                                            <p className="text-sm text-gray-500 py-2">لا يوجد طلاب في حلقات هذا المعلم.</p>
                                                        ) : (
                                                            <div className="divide-y divide-gray-200">
                                                                {row.students.map(st => (
                                                                    <div key={st.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                                                                        <Link to={`/dashboard/students/${st.id}`} className="font-medium hover:text-orange-600">
                                                                            {st.name} <span className="text-xs text-gray-500">· {st.halaqa}</span>
                                                                        </Link>
                                                                        <span className="text-gray-600">
                                                                            {countNoun(st.sessions, SESSIONS)} · {st.newPages} صفحة جديدة · {st.avgScore === null ? 'بدون تقدير' : scoreLabel(st.avgScore)}
                                                                            {' · '}
                                                                            {st.lastDate
                                                                                ? <span className={st.lastDate < weekAgo ? 'text-red-700' : ''}>آخر تسميع {st.lastDate}</span>
                                                                                : <span className="text-red-700">لم يسمّع في الفترة</span>}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </Fragment>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Button variant="outline" asChild>
                <Link to="/dashboard/schedule">عرض جدول المعلمين</Link>
            </Button>
        </div>
    );
}
