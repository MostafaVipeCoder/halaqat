import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { DEFAULT_CRITERIA, EXAM_TYPES } from './examLabels';
import type { Exam, ExamCriterion, ExamType } from '../../../types';
import type { ExamInput } from '../../../services/examService';

interface ExamDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    exam?: Exam | null;
    classes: { id: string; name: string }[];
    /** بعد بدء الرصد لا تتغير بنود الدرجات */
    criteriaLocked?: boolean;
    onSubmit: (input: ExamInput) => Promise<unknown>;
    isSaving?: boolean;
}

export default function ExamDialog({ open, onOpenChange, exam, classes, criteriaLocked, onSubmit, isSaving }: ExamDialogProps) {
    const [title, setTitle] = useState('');
    const [examType, setExamType] = useState<ExamType>('monthly');
    const [examDate, setExamDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [classIds, setClassIds] = useState<string[]>([]);
    const [scope, setScope] = useState('');
    const [criteria, setCriteria] = useState<ExamCriterion[]>(DEFAULT_CRITERIA);
    const [passPercent, setPassPercent] = useState(50);

    useEffect(() => {
        if (!open) return;
        setTitle(exam?.title ?? '');
        setExamType(exam?.exam_type ?? 'monthly');
        setExamDate(exam?.exam_date ?? format(new Date(), 'yyyy-MM-dd'));
        setClassIds(exam?.class_ids ?? []);
        setScope(exam?.scope ?? '');
        setCriteria(exam?.criteria ?? DEFAULT_CRITERIA);
        setPassPercent(Number(exam?.pass_percent ?? 50));
    }, [open, exam]);

    const totalMax = criteria.reduce((s, c) => s + (Number(c.max) || 0), 0);

    const updateCriterion = (i: number, patch: Partial<ExamCriterion>) =>
        setCriteria(list => list.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

    const handleSubmit = async () => {
        if (!title.trim()) return toast.error('اكتب عنوان الامتحان');
        if (classIds.length === 0) return toast.error('اختر حلقة واحدة على الأقل');
        if (criteria.length === 0 || criteria.some(c => !c.label.trim() || !(Number(c.max) > 0))) {
            return toast.error('كل بند يحتاج اسمًا ودرجة عظمى أكبر من صفر');
        }
        try {
            await onSubmit({
                title: title.trim(),
                exam_type: examType,
                exam_date: examDate,
                class_ids: classIds,
                scope: scope.trim() || null,
                criteria: criteria.map((c, i) => ({ key: c.key || `c${i + 1}`, label: c.label.trim(), max: Number(c.max) })),
                pass_percent: passPercent,
            });
            onOpenChange(false);
        } catch {
            // الرسالة تظهر من الـ hook
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="mz sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl" onInteractOutside={(e: any) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>{exam ? 'تعديل الامتحان' : 'امتحان جديد'}</DialogTitle>
                    <DialogDescription>يُنشأ كمسودة، ثم يفتح الكونترول الرصد للمعلمين</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="exam-title">عنوان الامتحان *</Label>
                            <Input id="exam-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: اختبار شهر جمادى الأولى" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="exam-type">النوع</Label>
                            <Select value={examType} onValueChange={(v: ExamType) => setExamType(v)}>
                                <SelectTrigger id="exam-type"><SelectValue /></SelectTrigger>
                                <SelectContent>{EXAM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="exam-date">التاريخ</Label>
                            <Input id="exam-date" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="exam-scope">المقرر</Label>
                            <Input id="exam-scope" value={scope} onChange={(e) => setScope(e.target.value)} placeholder="مثال: من سورة النبأ إلى سورة الناس" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>الحلقات المشمولة *</Label>
                        <div className="flex flex-wrap gap-2">
                            {classes.map(c => {
                                const selected = classIds.includes(c.id);
                                return (
                                    <button key={c.id} type="button" aria-pressed={selected}
                                        onClick={() => setClassIds(ids => selected ? ids.filter(x => x !== c.id) : [...ids, c.id])}
                                        className={`px-3 py-1.5 rounded-lg text-sm border ${selected
                                            ? 'bg-orange-500 text-white border-orange-500'
                                            : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300'}`}>
                                        {c.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>بنود الدرجات (المجموع {totalMax})</Label>
                            {!criteriaLocked && (
                                <Button type="button" size="sm" variant="outline"
                                    onClick={() => setCriteria(list => [...list, { key: `c${Date.now()}`, label: '', max: 10 }])}>
                                    <Plus className="h-4 w-4 ml-1" /> بند
                                </Button>
                            )}
                        </div>
                        {criteriaLocked && <p className="text-xs text-gray-500">بدأ الرصد، فلا يمكن تغيير البنود.</p>}
                        <div className="space-y-2">
                            {criteria.map((c, i) => (
                                <div key={c.key || i} className="flex gap-2 items-center">
                                    <Input aria-label="اسم البند" value={c.label} disabled={criteriaLocked}
                                        onChange={(e) => updateCriterion(i, { label: e.target.value })} placeholder="اسم البند" />
                                    <Input aria-label="الدرجة العظمى" type="number" min={1} className="w-24" value={c.max} disabled={criteriaLocked}
                                        onChange={(e) => updateCriterion(i, { max: Number(e.target.value) })} />
                                    {!criteriaLocked && (
                                        <Button type="button" size="sm" variant="ghost" aria-label="حذف البند"
                                            onClick={() => setCriteria(list => list.filter((_, idx) => idx !== i))}>
                                            <Trash2 className="h-4 w-4 text-red-600" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2 max-w-48">
                        <Label htmlFor="exam-pass">نسبة النجاح (%)</Label>
                        <Input id="exam-pass" type="number" min={0} max={100} value={passPercent}
                            onChange={(e) => setPassPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
                    <Button onClick={handleSubmit} disabled={isSaving} className="bg-orange-500 hover:bg-orange-600 text-white">
                        {isSaving ? 'جاري الحفظ...' : exam ? 'حفظ' : 'إنشاء الامتحان'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
