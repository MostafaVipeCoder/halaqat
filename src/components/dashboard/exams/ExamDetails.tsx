import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowRight, Check, Lock, Pencil, RotateCcw, Save, Send, Trash2, Unlock } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Checkbox } from '../../ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import ExamDialog from './ExamDialog';
import { EXAM_STATUSES, examTypeLabel, gradeClass, previewResult, statusMeta } from './examLabels';
import { useExam } from '../../../hooks/useExams';
import { useStudents } from '../../../hooks/useStudents';
import { useClasses } from '../../../hooks/useClasses';
import { useCurrentProfile } from '../../../hooks/useCurrentProfile';
import { countNoun, STUDENTS } from '../../../lib/arabicPlural';
import type { ExamStatus } from '../../../types';
import type { ResultInput } from '../../../services/examService';

interface Draft {
    scores: Record<string, number | ''>;
    is_absent: boolean;
    notes: string;
}

export default function ExamDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { exam, results, changes, isLoading, updateExam, deleteExam, saveResults, isSaving } = useExam(id);
    const { students } = useStudents();
    const { classes } = useClasses();
    const { can } = useCurrentProfile();
    const isControl = can('exams.manage');

    const [drafts, setDrafts] = useState<Record<string, Draft>>({});
    const [dirty, setDirty] = useState<Set<string>>(new Set());
    const [reasonFor, setReasonFor] = useState<string[] | null>(null);
    const [reason, setReason] = useState('');
    const [editOpen, setEditOpen] = useState(false);

    const examStudents = useMemo(() => {
        if (!exam) return [];
        return (students as any[])
            .filter(s => exam.class_ids.includes(s.class_id) && s.status !== 'expelled')
            .sort((a, b) => (a.classes?.name ?? '').localeCompare(b.classes?.name ?? '') || a.name.localeCompare(b.name));
    }, [exam, students]);

    // تهيئة المسودات من النتائج المحفوظة (بدون مسح ما يكتبه المستخدم)
    useEffect(() => {
        if (!exam) return;
        setDrafts(prev => {
            const next = { ...prev };
            for (const st of examStudents) {
                if (dirty.has(st.id)) continue;
                const r = results.find(x => x.student_id === st.id);
                next[st.id] = {
                    scores: Object.fromEntries(exam.criteria.map(c => [c.key, r && !r.is_absent ? Number(r.scores[c.key] ?? 0) : ''])),
                    is_absent: r?.is_absent ?? false,
                    notes: r?.notes ?? '',
                };
            }
            return next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exam, results, examStudents]);

    if (isLoading || !exam) {
        return (
            <div className="flex justify-center py-20">
                <div className="h-8 w-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    const canEditMarks = (exam.status === 'grading' && (can('exams.grade') || isControl))
        || ((exam.status === 'review' || exam.status === 'approved') && isControl);

    const setDraft = (studentId: string, patch: Partial<Draft>) => {
        setDrafts(d => ({ ...d, [studentId]: { ...d[studentId], ...patch } }));
        setDirty(s => new Set(s).add(studentId));
    };

    const setScore = (studentId: string, key: string, raw: string, max: number) => {
        const value = raw === '' ? '' : Math.max(0, Math.min(max, Number(raw)));
        setDraft(studentId, { scores: { ...drafts[studentId]?.scores, [key]: value } });
    };

    const toRow = (studentId: string, changeReason?: string): ResultInput => {
        const d = drafts[studentId];
        return {
            exam_id: exam.id,
            student_id: studentId,
            scores: d.is_absent ? {} : Object.fromEntries(exam.criteria.map(c => [c.key, Number(d.scores[c.key]) || 0])),
            is_absent: d.is_absent,
            notes: d.notes.trim() || null,
            change_reason: changeReason ?? null,
        };
    };

    const persist = async (ids: string[], changeReason?: string) => {
        await saveResults(ids.map(sid => toRow(sid, changeReason)));
        setDirty(s => { const n = new Set(s); ids.forEach(i => n.delete(i)); return n; });
    };

    const requestSave = (ids: string[]) => {
        if (ids.length === 0) return;
        if (exam.status === 'approved') {
            setReason('');
            setReasonFor(ids);
        } else {
            persist(ids).catch(() => undefined);
        }
    };

    const setStatus = async (status: ExamStatus) => {
        if (dirty.size > 0 && !window.confirm('توجد درجات لم تُحفظ بعد. المتابعة بدون حفظها؟')) return;
        await updateExam({ status });
        setDirty(new Set());
    };

    const graded = results.length;
    const present = results.filter(r => !r.is_absent);
    const avg = present.length ? Math.round(present.reduce((s, r) => s + Number(r.percent), 0) / present.length) : null;
    const passRate = graded ? Math.round((results.filter(r => r.grade && !['راسب', 'غائب'].includes(r.grade)).length / graded) * 100) : null;
    const top = [...present].sort((a, b) => Number(b.percent) - Number(a.percent))[0];
    const topName = top ? (examStudents.find(s => s.id === top.student_id)?.name ?? '') : '';
    const distribution = ['ممتاز', 'جيد جدًا', 'جيد', 'مقبول', 'راسب', 'غائب']
        .map(g => ({ g, n: results.filter(r => r.grade === g).length }))
        .filter(x => x.n > 0);
    const ungraded = examStudents.length - graded;
    const classNames = classes.filter((c: any) => exam.class_ids.includes(c.id)).map((c: any) => c.name).join('، ');
    const totalMax = exam.criteria.reduce((s, c) => s + c.max, 0);
    const statusIndex = EXAM_STATUSES.findIndex(s => s.value === exam.status);

    return (
        <div className="mz space-y-6" dir="rtl">
            <Link to="/dashboard/exams" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-orange-600">
                <ArrowRight className="h-4 w-4" /> كل الامتحانات
            </Link>

            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-bold">{exam.title}</h1>
                        <Badge variant="outline" className={statusMeta(exam.status).className}>{statusMeta(exam.status).label}</Badge>
                    </div>
                    <p className="text-gray-600 mt-1">
                        {examTypeLabel(exam.exam_type)} · {exam.exam_date} · {classNames}
                        {exam.scope ? ` · ${exam.scope}` : ''} · من {totalMax} · النجاح {Number(exam.pass_percent)}%
                    </p>
                </div>

                {isControl && (
                    <div className="flex flex-wrap gap-2">
                        {exam.status === 'draft' && (
                            <>
                                <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4 ml-1" /> تعديل</Button>
                                <Button variant="outline" className="text-red-700 border-red-200 hover:bg-red-50"
                                    onClick={async () => { if (window.confirm('حذف هذا الامتحان؟')) { await deleteExam(); navigate('/dashboard/exams'); } }}>
                                    <Trash2 className="h-4 w-4 ml-1" /> حذف
                                </Button>
                                <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setStatus('grading')}>
                                    <Unlock className="h-4 w-4 ml-1" /> فتح الرصد للمعلمين
                                </Button>
                            </>
                        )}
                        {exam.status === 'grading' && (
                            <Button className="bg-orange-500 hover:bg-orange-600 text-white"
                                onClick={() => (ungraded === 0 || window.confirm(`لم تُرصد درجات ${countNoun(ungraded, STUDENTS)}. إغلاق الرصد على أي حال؟`)) && setStatus('review')}>
                                <Send className="h-4 w-4 ml-1" /> إغلاق الرصد وإرسال للمراجعة
                            </Button>
                        )}
                        {exam.status === 'review' && (
                            <>
                                <Button variant="outline" onClick={() => setStatus('grading')}><RotateCcw className="h-4 w-4 ml-1" /> إعادة فتح الرصد</Button>
                                <Button className="bg-orange-500 hover:bg-orange-600 text-white"
                                    onClick={() => window.confirm('اعتماد النتيجة؟ بعد الاعتماد أي تعديل يتطلب سببًا ويُسجَّل.') && setStatus('approved')}>
                                    <Lock className="h-4 w-4 ml-1" /> اعتماد النتيجة
                                </Button>
                            </>
                        )}
                        {exam.status === 'approved' && (
                            <Button variant="outline" onClick={() => window.confirm('إلغاء الاعتماد وإعادة النتيجة للمراجعة؟') && setStatus('review')}>
                                <RotateCcw className="h-4 w-4 ml-1" /> إلغاء الاعتماد
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* مراحل الامتحان */}
            <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {EXAM_STATUSES.map((s, i) => (
                    <li key={s.value} className={`rounded-lg border p-3 ${i === statusIndex ? 'border-orange-500 bg-orange-50' : i < statusIndex ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50'}`}>
                        <span className={`flex items-center gap-1 text-sm font-semibold ${i <= statusIndex ? 'text-orange-700' : 'text-gray-500'}`}>
                            {i < statusIndex && <Check className="h-4 w-4" />}{i + 1}. {s.label}
                        </span>
                        <span className="block text-xs text-gray-600 mt-1">{s.hint}</span>
                    </li>
                ))}
            </ol>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card><CardContent className="pt-6"><p className="text-sm text-gray-600">تم الرصد</p><p className="text-2xl font-bold">{graded} من {examStudents.length}</p></CardContent></Card>
                <Card><CardContent className="pt-6"><p className="text-sm text-gray-600">متوسط النسبة</p><p className="text-2xl font-bold">{avg === null ? '-' : `${avg}%`}</p></CardContent></Card>
                <Card><CardContent className="pt-6"><p className="text-sm text-gray-600">نسبة النجاح</p><p className="text-2xl font-bold">{passRate === null ? '-' : `${passRate}%`}</p></CardContent></Card>
                <Card><CardContent className="pt-6"><p className="text-sm text-gray-600">الأعلى</p><p className="text-lg font-bold truncate">{top ? `${topName} (${Number(top.percent)}%)` : '-'}</p></CardContent></Card>
            </div>
            {distribution.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {distribution.map(d => <Badge key={d.g} variant="outline" className={gradeClass(d.g)}>{d.g}: {d.n}</Badge>)}
                </div>
            )}

            <Tabs defaultValue="sheet">
                <TabsList className="bg-white border p-1">
                    <TabsTrigger value="sheet" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">كشف الدرجات</TabsTrigger>
                    {(isControl || can('reports.view')) && (
                        <TabsTrigger value="log" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">
                            سجل التعديلات ({changes.length})
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="sheet">
                    <Card>
                        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <CardTitle className="text-base">
                                {exam.status === 'draft' && 'الامتحان مسودة — يفتح الكونترول الرصد ليبدأ المعلمون'}
                                {exam.status === 'grading' && (canEditMarks ? 'الرصد مفتوح — أدخل الدرجات واحفظ' : 'الرصد مفتوح')}
                                {exam.status === 'review' && (isControl ? 'مراجعة الكونترول — تعديلاتك تُسجَّل' : 'الرصد مغلق — قيد مراجعة الكونترول')}
                                {exam.status === 'approved' && (isControl ? 'نتيجة معتمدة — التعديل يتطلب سببًا' : 'نتيجة معتمدة')}
                            </CardTitle>
                            {canEditMarks && (
                                <Button disabled={dirty.size === 0 || isSaving} onClick={() => requestSave([...dirty])}
                                    className="bg-orange-500 hover:bg-orange-600 text-white">
                                    <Save className="h-4 w-4 ml-1" /> حفظ الكل {dirty.size > 0 ? `(${dirty.size})` : ''}
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            {examStudents.length === 0 ? (
                                <p className="text-center text-gray-500 py-10">لا يوجد طلاب ظاهرون لك في حلقات هذا الامتحان.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-right">الطالب</TableHead>
                                                {exam.criteria.map(c => <TableHead key={c.key} className="text-right">{c.label} ({c.max})</TableHead>)}
                                                <TableHead className="text-right">غائب</TableHead>
                                                <TableHead className="text-right">المجموع</TableHead>
                                                <TableHead className="text-right">التقدير</TableHead>
                                                <TableHead className="text-right">ملاحظات</TableHead>
                                                {canEditMarks && <TableHead />}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {examStudents.map(st => {
                                                const d = drafts[st.id];
                                                if (!d) return null;
                                                const saved = results.find(r => r.student_id === st.id);
                                                const preview = previewResult(exam.criteria, d.scores, d.is_absent, Number(exam.pass_percent));
                                                const isDirty = dirty.has(st.id);
                                                const shown = isDirty || !saved ? preview : { total: Number(saved.total), percent: Number(saved.percent), grade: saved.grade };
                                                const hasAny = isDirty || !!saved;
                                                return (
                                                    <TableRow key={st.id} className={isDirty ? 'bg-yellow-50' : ''}>
                                                        <TableCell>
                                                            <span className="font-medium text-gray-900">{st.name}</span>
                                                            <span className="block text-xs text-gray-500">{st.classes?.name}</span>
                                                        </TableCell>
                                                        {exam.criteria.map(c => (
                                                            <TableCell key={c.key}>
                                                                <Input type="number" min={0} max={c.max} className="w-20"
                                                                    aria-label={`${c.label} — ${st.name}`}
                                                                    value={d.is_absent ? '' : d.scores[c.key]}
                                                                    disabled={!canEditMarks || d.is_absent}
                                                                    onChange={(e) => setScore(st.id, c.key, e.target.value, c.max)} />
                                                            </TableCell>
                                                        ))}
                                                        <TableCell>
                                                            <Checkbox checked={d.is_absent} disabled={!canEditMarks} aria-label={`غائب — ${st.name}`}
                                                                onCheckedChange={(v) => setDraft(st.id, { is_absent: v === true })} />
                                                        </TableCell>
                                                        <TableCell className="whitespace-nowrap">{hasAny && shown.grade !== 'غائب' ? `${shown.total} (${shown.percent}%)` : '-'}</TableCell>
                                                        <TableCell>{hasAny && shown.grade ? <Badge variant="outline" className={gradeClass(shown.grade)}>{shown.grade}</Badge> : <span className="text-gray-500">لم يُرصد</span>}</TableCell>
                                                        <TableCell>
                                                            <Input className="min-w-32" aria-label={`ملاحظات — ${st.name}`} value={d.notes} disabled={!canEditMarks}
                                                                onChange={(e) => setDraft(st.id, { notes: e.target.value })} />
                                                        </TableCell>
                                                        {canEditMarks && (
                                                            <TableCell>
                                                                <Button size="sm" variant="ghost" disabled={!isDirty || isSaving} onClick={() => requestSave([st.id])} aria-label={`حفظ ${st.name}`}>
                                                                    <Save className="h-4 w-4" />
                                                                </Button>
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="log">
                    <Card>
                        <CardContent className="pt-6">
                            {changes.length === 0 ? (
                                <p className="text-center text-gray-500 py-10">لا توجد تعديلات بعد إغلاق الرصد.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-right">الوقت</TableHead>
                                                <TableHead className="text-right">الطالب</TableHead>
                                                <TableHead className="text-right">المرحلة</TableHead>
                                                <TableHead className="text-right">من</TableHead>
                                                <TableHead className="text-right">إلى</TableHead>
                                                <TableHead className="text-right">السبب</TableHead>
                                                <TableHead className="text-right">بواسطة</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {changes.map(ch => (
                                                <TableRow key={ch.id}>
                                                    <TableCell className="whitespace-nowrap">{format(new Date(ch.changed_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                                                    <TableCell>{ch.students?.name}</TableCell>
                                                    <TableCell><Badge variant="outline" className={statusMeta(ch.exam_status).className}>{statusMeta(ch.exam_status).label}</Badge></TableCell>
                                                    <TableCell>{ch.old_absent ? 'غائب' : Number(ch.old_total)}</TableCell>
                                                    <TableCell className="font-semibold">{ch.new_absent ? 'غائب' : Number(ch.new_total)}</TableCell>
                                                    <TableCell className="max-w-xs">{ch.reason || <span className="text-gray-500">—</span>}</TableCell>
                                                    <TableCell>{ch.changer?.full_name ?? '-'}</TableCell>
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

            {/* سبب تعديل نتيجة معتمدة */}
            <Dialog open={!!reasonFor} onOpenChange={(o) => !o && setReasonFor(null)}>
                <DialogContent className="mz sm:max-w-md" dir="rtl">
                    <DialogHeader>
                        <DialogTitle>سبب تعديل نتيجة معتمدة</DialogTitle>
                        <DialogDescription>سيُحفظ السبب في سجل التعديلات مع الدرجة القديمة والجديدة.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="change-reason">السبب *</Label>
                        <Textarea id="change-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: تظلّم ولي الأمر وإعادة مراجعة التسجيل" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReasonFor(null)}>إلغاء</Button>
                        <Button disabled={!reason.trim() || isSaving} className="bg-orange-500 hover:bg-orange-600 text-white"
                            onClick={async () => {
                                try { await persist(reasonFor!, reason.trim()); setReasonFor(null); } catch { /* الرسالة من الـ hook */ }
                            }}>
                            حفظ التعديل
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ExamDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                exam={exam}
                classes={classes as any}
                criteriaLocked={results.length > 0}
                onSubmit={(input) => updateExam(input)}
            />
        </div>
    );
}
