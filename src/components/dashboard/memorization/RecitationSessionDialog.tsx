import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import SurahAyahPicker from './SurahAyahPicker';
import { RECITATION_GRADES, RECITATION_TYPES, countsAsMemorized, gradeMeta, suggestGrade } from './labels';
import { estimatePages, getSurah, nextStartAfter, type AyahRef, type MemorizationDirection } from '../../../lib/quran';
import { useMemorizationPlan, useRecitationSessions } from '../../../hooks/useMemorization';
import type { RecitationGrade, RecitationSession, RecitationType } from '../../../types';
import type { NewRecitationSession } from '../../../services/memorizationService';

export interface RecitationStudent {
    id: string;
    name: string;
    class_id?: string | null;
}

interface RecitationSessionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    students: RecitationStudent[];
    /** عند فتح النافذة من ملف طالب أو من كشف الحلقة */
    fixedStudentId?: string;
    onSubmit: (session: NewRecitationSession) => Promise<unknown>;
    isSubmitting?: boolean;
}

const defaultRange = (start: AyahRef): { from: AyahRef; to: AyahRef } => {
    const ayahs = getSurah(start.surah)?.ayahs ?? start.ayah;
    const remaining = ayahs - start.ayah + 1;
    return { from: start, to: { surah: start.surah, ayah: remaining <= 10 ? ayahs : start.ayah + 9 } };
};

/** اقتراح بداية الحفظ الجديد: بعد آخر مقطع محفوظ، أو أول سورة غير محفوظة حسب اتجاه الخطة */
export const suggestStart = (
    studentSessions: RecitationSession[],
    direction: MemorizationDirection,
    baseline: number[]
): AyahRef => {
    const lastNew = studentSessions.find(countsAsMemorized);
    if (lastNew) {
        const next = nextStartAfter({ surah: lastNew.to_surah, ayah: lastNew.to_ayah }, direction);
        if (next) return next;
    }
    const order = direction === 'backward'
        ? Array.from({ length: 114 }, (_, i) => 114 - i)
        : Array.from({ length: 114 }, (_, i) => i + 1);
    return { surah: order.find(n => !baseline.includes(n)) ?? order[0], ayah: 1 };
};

export default function RecitationSessionDialog({
    open,
    onOpenChange,
    students,
    fixedStudentId,
    onSubmit,
    isSubmitting,
}: RecitationSessionDialogProps) {
    const [studentId, setStudentId] = useState(fixedStudentId || '');
    const [sessionDate, setSessionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [type, setType] = useState<RecitationType>('new');
    const [range, setRange] = useState(defaultRange({ surah: 114, ayah: 1 }));
    const [pages, setPages] = useState(0);
    const [pagesEdited, setPagesEdited] = useState(false);
    const [errors, setErrors] = useState({ memorization: 0, tashkeel: 0, tajweed: 0, hints: 0 });
    const [grade, setGrade] = useState<RecitationGrade>('excellent');
    const [gradeEdited, setGradeEdited] = useState(false);
    const [teacherName, setTeacherName] = useState('');
    const [notes, setNotes] = useState('');

    const { plan } = useMemorizationPlan(studentId || undefined);
    const direction = plan?.direction ?? 'backward';

    // سجل الطالب كاملاً (لاقتراح الورد التالي بعد آخر حفظ)
    const { sessions: studentSessions } = useRecitationSessions({ studentId: studentId || undefined, enabled: !!studentId });

    // إعادة تهيئة النموذج عند الفتح
    useEffect(() => {
        if (!open) return;
        setStudentId(fixedStudentId || '');
        setSessionDate(format(new Date(), 'yyyy-MM-dd'));
        setType('new');
        setPagesEdited(false);
        setErrors({ memorization: 0, tashkeel: 0, tajweed: 0, hints: 0 });
        setGradeEdited(false);
        setNotes('');
    }, [open, fixedStudentId]);

    // اقتراح الورد التالي عند اختيار الطالب أو تحميل خطته
    useEffect(() => {
        if (!open || !studentId || type !== 'new') return;
        setRange(defaultRange(suggestStart(studentSessions, direction, plan?.baseline_surahs ?? [])));
        setPagesEdited(false);
    }, [open, studentId, type, direction, plan, studentSessions]);

    useEffect(() => {
        if (!pagesEdited) setPages(estimatePages(range.from, range.to));
    }, [range, pagesEdited]);

    useEffect(() => {
        if (!gradeEdited) setGrade(suggestGrade(errors));
    }, [errors, gradeEdited]);

    const lastNew = studentSessions.find(countsAsMemorized);

    const handleSubmit = async () => {
        const student = students.find(s => s.id === studentId);
        if (!student) {
            toast.error('يرجى اختيار الطالب');
            return;
        }
        if (range.from.surah === range.to.surah && range.to.ayah < range.from.ayah) {
            toast.error('آية النهاية يجب أن تكون بعد آية البداية');
            return;
        }
        try {
            await onSubmit({
                student_id: student.id,
                class_id: student.class_id || null,
                session_date: sessionDate,
                type,
                from_surah: range.from.surah,
                from_ayah: range.from.ayah,
                to_surah: range.to.surah,
                to_ayah: range.to.ayah,
                pages,
                memorization_errors: errors.memorization,
                tashkeel_errors: errors.tashkeel,
                tajweed_errors: errors.tajweed,
                hints: errors.hints,
                grade,
                teacher_name: teacherName.trim() || null,
                notes: notes.trim() || null,
            });
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        }
    };

    const errorFields: { key: keyof typeof errors; label: string }[] = [
        { key: 'memorization', label: 'أخطاء الحفظ' },
        { key: 'tashkeel', label: 'أخطاء التشكيل' },
        { key: 'tajweed', label: 'أخطاء التجويد' },
        { key: 'hints', label: 'التنبيهات (الفتح)' },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="mz sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl" onInteractOutside={(e: any) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>تسجيل تسميع</DialogTitle>
                    <DialogDescription>سجّل المقطع الذي سمّعه الطالب وتقييم أدائه</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2 sm:col-span-1">
                            <Label htmlFor="rec-student">الطالب *</Label>
                            <Select value={studentId} onValueChange={setStudentId} disabled={!!fixedStudentId}>
                                <SelectTrigger id="rec-student">
                                    <SelectValue placeholder="اختر الطالب" />
                                </SelectTrigger>
                                <SelectContent className="mz max-h-72">
                                    {students.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rec-type">نوع التسميع *</Label>
                            <Select value={type} onValueChange={(v: RecitationType) => setType(v)}>
                                <SelectTrigger id="rec-type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {RECITATION_TYPES.map(t => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rec-date">التاريخ *</Label>
                            <Input id="rec-date" type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
                        </div>
                    </div>

                    {studentId && type === 'new' && (
                        <div className="flex items-start gap-2 rounded-lg bg-orange-50 border border-orange-100 p-3 text-sm text-orange-800">
                            <Sparkles className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>
                                {lastNew
                                    ? `تم اقتراح الورد التالي بعد آخر حفظ (${getSurah(lastNew.to_surah)?.name} ${lastNew.to_ayah}).`
                                    : 'لا يوجد حفظ سابق مسجّل، تم اقتراح البداية حسب اتجاه خطة الحفظ.'}
                                {' '}الاتجاه: {direction === 'backward' ? 'من الناس صعودًا' : 'من الفاتحة نزولًا'}
                            </span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <SurahAyahPicker idPrefix="rec-from" label="من *" value={range.from} onChange={(from) => setRange(r => ({ ...r, from }))} />
                        <SurahAyahPicker idPrefix="rec-to" label="إلى *" value={range.to} onChange={(to) => setRange(r => ({ ...r, to }))} />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {errorFields.map(f => (
                            <div key={f.key} className="space-y-2">
                                <Label htmlFor={`rec-${f.key}`}>{f.label}</Label>
                                <Input
                                    id={`rec-${f.key}`}
                                    type="number"
                                    min={0}
                                    value={errors[f.key]}
                                    onChange={(e) => setErrors(prev => ({ ...prev, [f.key]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="rec-pages">عدد الصفحات</Label>
                            <Input
                                id="rec-pages"
                                type="number"
                                min={0}
                                step={0.25}
                                value={pages}
                                onChange={(e) => {
                                    setPagesEdited(true);
                                    setPages(Math.max(0, parseFloat(e.target.value) || 0));
                                }}
                            />
                            {!pagesEdited && <p className="text-[11px] text-gray-400">تقدير تلقائي حسب المقطع</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rec-grade">التقدير *</Label>
                            <Select
                                value={grade}
                                onValueChange={(v: RecitationGrade) => {
                                    setGradeEdited(true);
                                    setGrade(v);
                                }}
                            >
                                <SelectTrigger id="rec-grade">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {RECITATION_GRADES.map(g => (
                                        <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {!gradeEdited && <p className="text-[11px] text-gray-400">مقترح من الأخطاء: {gradeMeta(grade).label}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rec-teacher">المحفّظ</Label>
                            <Input id="rec-teacher" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="اختياري" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="rec-notes">ملاحظات</Label>
                        <Textarea id="rec-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="مثال: يحتاج تثبيت المتشابهات في آخر الصفحة" />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-orange-500 hover:bg-orange-600 text-black">
                        {isSubmitting ? 'جاري الحفظ...' : 'حفظ التسميع'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
