import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ClipboardList, FileCheck2, PenLine, Plus } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent } from '../../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import KPICard from '../KPICard';
import ExamDialog from './ExamDialog';
import { EXAM_STATUSES, examTypeLabel, statusMeta } from './examLabels';
import { useExams } from '../../../hooks/useExams';
import { useClasses } from '../../../hooks/useClasses';
import { useCurrentProfile } from '../../../hooks/useCurrentProfile';

export default function Exams() {
    const navigate = useNavigate();
    const { exams, summaries, isLoading, createExam, isCreating } = useExams();
    const { classes } = useClasses();
    const { can } = useCurrentProfile();
    const isControl = can('exams.manage');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dialogOpen, setDialogOpen] = useState(false);

    const stats = useMemo(() => {
        const byExam = new Map<string, { graded: number; present: number; sum: number; passed: number }>();
        for (const r of summaries) {
            const s = byExam.get(r.exam_id) ?? { graded: 0, present: 0, sum: 0, passed: 0 };
            s.graded += 1;
            if (!r.is_absent) { s.present += 1; s.sum += Number(r.percent); }
            if (r.grade && !['راسب', 'غائب'].includes(r.grade)) s.passed += 1;
            byExam.set(r.exam_id, s);
        }
        return byExam;
    }, [summaries]);

    const classNames = (ids: string[]) => classes.filter((c: any) => ids.includes(c.id)).map((c: any) => c.name).join('، ');
    const filtered = exams.filter(e => statusFilter === 'all' || e.status === statusFilter);
    const count = (s: string) => exams.filter(e => e.status === s).length;

    return (
        <div className="mz space-y-6" dir="rtl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">الامتحانات ورصد الدرجات</h1>
                    <p className="text-gray-600 mt-1">إنشاء الامتحانات، ورصد الدرجات، ومراجعة واعتماد الكونترول</p>
                </div>
                {isControl && (
                    <Button onClick={() => setDialogOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
                        <Plus className="h-4 w-4 ml-2" /> امتحان جديد
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <KPICard label="كل الامتحانات" value={exams.length} icon={ClipboardList} color="orange" />
                <KPICard label="مفتوحة للرصد" value={count('grading')} icon={PenLine} color="blue" />
                <KPICard label="بانتظار الكونترول" value={count('review')} icon={FileCheck2} color="red" />
                <KPICard label="معتمدة" value={count('approved')} icon={CheckCircle2} color="green" />
            </div>

            <Card>
                <CardContent className="pt-6 space-y-4">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-56" aria-label="الحالة"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">كل الحالات</SelectItem>
                            {EXAM_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="h-8 w-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center text-center py-12 gap-3">
                            <ClipboardList className="h-10 w-10 text-gray-300" />
                            <p className="text-gray-600">{exams.length === 0 ? 'لا توجد امتحانات بعد.' : 'لا توجد امتحانات بهذه الحالة.'}</p>
                            {isControl && exams.length === 0 && (
                                <Button onClick={() => setDialogOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
                                    <Plus className="h-4 w-4 ml-2" /> إنشاء أول امتحان
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-right">الامتحان</TableHead>
                                        <TableHead className="text-right">التاريخ</TableHead>
                                        <TableHead className="text-right">الحلقات</TableHead>
                                        <TableHead className="text-right">الحالة</TableHead>
                                        <TableHead className="text-right">تم رصده</TableHead>
                                        <TableHead className="text-right">المتوسط</TableHead>
                                        <TableHead className="text-right">النجاح</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map(e => {
                                        const s = stats.get(e.id);
                                        const graded = s ? s.graded : 0;
                                        return (
                                            <TableRow key={e.id} className="cursor-pointer" onClick={() => navigate(`/dashboard/exams/${e.id}`)}>
                                                <TableCell>
                                                    <span className="font-medium text-gray-900">{e.title}</span>
                                                    <span className="block text-xs text-gray-500">{examTypeLabel(e.exam_type)}{e.scope ? ` · ${e.scope}` : ''}</span>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">{e.exam_date}</TableCell>
                                                <TableCell>{classNames(e.class_ids) || '-'}</TableCell>
                                                <TableCell><Badge variant="outline" className={statusMeta(e.status).className}>{statusMeta(e.status).label}</Badge></TableCell>
                                                <TableCell>{graded}</TableCell>
                                                <TableCell>{s && s.present ? `${Math.round(s.sum / s.present)}%` : '-'}</TableCell>
                                                <TableCell>{s && s.graded ? `${Math.round((s.passed / s.graded) * 100)}%` : '-'}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <ExamDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                classes={classes as any}
                onSubmit={async (input) => {
                    const created = await createExam(input);
                    navigate(`/dashboard/exams/${created.id}`);
                }}
                isSaving={isCreating}
            />
        </div>
    );
}
