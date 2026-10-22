import { useEffect, useState } from 'react';
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { SURAHS, surahsFullyInJuz } from '../../../lib/quran';
import type { MemorizationPlan } from '../../../types';
import type { MemorizationPlanInput } from '../../../services/memorizationService';

interface MemorizationPlanDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    studentId: string;
    studentName: string;
    plan: MemorizationPlan | null;
    onSave: (plan: MemorizationPlanInput) => Promise<unknown>;
    isSaving?: boolean;
}

const emptyForm = (studentId: string): MemorizationPlanInput => ({
    student_id: studentId,
    direction: 'backward',
    daily_amount: 1,
    amount_unit: 'pages',
    daily_review_pages: 2,
    target_juz_count: null,
    target_date: null,
    baseline_surahs: [],
    notes: null,
});

const QUICK_JUZ = [30, 29, 28];

export default function MemorizationPlanDialog({ open, onOpenChange, studentId, studentName, plan, onSave, isSaving }: MemorizationPlanDialogProps) {
    const [form, setForm] = useState<MemorizationPlanInput>(emptyForm(studentId));

    useEffect(() => {
        if (!open) return;
        setForm(plan ? {
            student_id: studentId,
            direction: plan.direction,
            daily_amount: Number(plan.daily_amount),
            amount_unit: plan.amount_unit,
            daily_review_pages: Number(plan.daily_review_pages),
            target_juz_count: plan.target_juz_count ?? null,
            target_date: plan.target_date ?? null,
            baseline_surahs: plan.baseline_surahs ?? [],
            notes: plan.notes ?? null,
        } : emptyForm(studentId));
    }, [open, plan, studentId]);

    const toggleSurah = (n: number) => {
        setForm(f => ({
            ...f,
            baseline_surahs: f.baseline_surahs.includes(n) ? f.baseline_surahs.filter(x => x !== n) : [...f.baseline_surahs, n].sort((a, b) => a - b),
        }));
    };

    const toggleJuz = (juz: number) => {
        const surahs = surahsFullyInJuz(juz);
        setForm(f => {
            const allSelected = surahs.every(n => f.baseline_surahs.includes(n));
            const next = allSelected
                ? f.baseline_surahs.filter(n => !surahs.includes(n))
                : Array.from(new Set([...f.baseline_surahs, ...surahs])).sort((a, b) => a - b);
            return { ...f, baseline_surahs: next };
        });
    };

    const handleSave = async () => {
        try {
            await onSave(form);
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="mz sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl" onInteractOutside={(e: any) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>خطة الحفظ</DialogTitle>
                    <DialogDescription>خطة الحفظ والمراجعة للطالب {studentName}</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="plan-direction">اتجاه الحفظ</Label>
                            <Select value={form.direction} onValueChange={(v: 'forward' | 'backward') => setForm({ ...form, direction: v })}>
                                <SelectTrigger id="plan-direction"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="backward">من الناس صعودًا (جزء عم أولاً)</SelectItem>
                                    <SelectItem value="forward">من الفاتحة نزولًا (البقرة أولاً)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="plan-amount">مقدار الحفظ اليومي</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="plan-amount"
                                    type="number"
                                    min={0.25}
                                    step={0.25}
                                    className="w-24"
                                    value={form.daily_amount}
                                    onChange={(e) => setForm({ ...form, daily_amount: Math.max(0.25, parseFloat(e.target.value) || 0.25) })}
                                />
                                <Select value={form.amount_unit} onValueChange={(v: 'lines' | 'pages' | 'quarters') => setForm({ ...form, amount_unit: v })}>
                                    <SelectTrigger className="flex-1" aria-label="وحدة المقدار"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="lines">سطر</SelectItem>
                                        <SelectItem value="pages">صفحة</SelectItem>
                                        <SelectItem value="quarters">ربع حزب</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="plan-review">المراجعة اليومية (صفحات)</Label>
                            <Input
                                id="plan-review"
                                type="number"
                                min={0}
                                step={0.5}
                                value={form.daily_review_pages}
                                onChange={(e) => setForm({ ...form, daily_review_pages: Math.max(0, parseFloat(e.target.value) || 0) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="plan-target-juz">الهدف (عدد الأجزاء)</Label>
                            <Input
                                id="plan-target-juz"
                                type="number"
                                min={1}
                                max={30}
                                placeholder="اختياري"
                                value={form.target_juz_count ?? ''}
                                onChange={(e) => setForm({ ...form, target_juz_count: e.target.value ? Math.min(30, Math.max(1, parseInt(e.target.value))) : null })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="plan-target-date">تاريخ الهدف</Label>
                            <Input
                                id="plan-target-date"
                                type="date"
                                value={form.target_date ?? ''}
                                onChange={(e) => setForm({ ...form, target_date: e.target.value || null })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <Label>المحفوظ قبل الالتحاق ({form.baseline_surahs.length} سورة)</Label>
                            <div className="flex flex-wrap gap-2">
                                {QUICK_JUZ.map(j => (
                                    <Button key={j} type="button" size="sm" variant="outline" onClick={() => toggleJuz(j)}>
                                        سور الجزء {j}
                                    </Button>
                                ))}
                                <Button type="button" size="sm" variant="ghost" onClick={() => setForm({ ...form, baseline_surahs: [] })}>
                                    مسح
                                </Button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto rounded-lg border p-2">
                            {SURAHS.map(s => {
                                const selected = form.baseline_surahs.includes(s.number);
                                return (
                                    <button
                                        key={s.number}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => toggleSurah(s.number)}
                                        className={`px-2 py-1 rounded-md text-xs border transition-colors ${selected
                                            ? 'bg-emerald-500 text-white border-emerald-500'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'}`}
                                    >
                                        {s.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="plan-notes">ملاحظات</Label>
                        <Textarea id="plan-notes" value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-orange-500 hover:bg-orange-600 text-black">
                        {isSaving ? 'جاري الحفظ...' : 'حفظ الخطة'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
