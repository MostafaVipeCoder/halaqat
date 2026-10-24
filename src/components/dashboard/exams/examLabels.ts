import type { ExamCriterion, ExamStatus, ExamType } from '../../../types';

export const EXAM_TYPES: { value: ExamType; label: string }[] = [
    { value: 'monthly', label: 'اختبار شهري' },
    { value: 'juz_completion', label: 'اختبار إتمام جزء' },
    { value: 'term', label: 'اختبار نهاية الفصل' },
    { value: 'placement', label: 'اختبار تحديد مستوى' },
    { value: 'khatma', label: 'اختبار الختمة' },
];

export const EXAM_STATUSES: { value: ExamStatus; label: string; className: string; hint: string }[] = [
    { value: 'draft', label: 'مسودة', className: 'bg-gray-100 text-gray-700 border-gray-200', hint: 'الكونترول يجهّز الامتحان وبنود الدرجات' },
    { value: 'grading', label: 'رصد الدرجات', className: 'bg-blue-50 text-blue-700 border-blue-200', hint: 'المعلمون يرصدون درجات طلابهم' },
    { value: 'review', label: 'مراجعة الكونترول', className: 'bg-yellow-50 text-yellow-800 border-yellow-200', hint: 'الرصد مغلق — الكونترول يراجع، وكل تعديل يُسجَّل' },
    { value: 'approved', label: 'معتمد', className: 'bg-green-50 text-green-700 border-green-200', hint: 'النتيجة مقفلة — أي تعديل يتطلب سببًا ويُسجَّل' },
];

export const examTypeLabel = (t: ExamType) => EXAM_TYPES.find(x => x.value === t)?.label ?? t;
export const statusMeta = (s: ExamStatus) => EXAM_STATUSES.find(x => x.value === s) ?? EXAM_STATUSES[0];

export const DEFAULT_CRITERIA: ExamCriterion[] = [
    { key: 'hifz', label: 'الحفظ', max: 60 },
    { key: 'tajweed', label: 'التجويد', max: 25 },
    { key: 'adaa', label: 'الأداء', max: 15 },
];

export const gradeClass = (grade: string | null) => {
    switch (grade) {
        case 'ممتاز': return 'bg-green-50 text-green-700 border-green-200';
        case 'جيد جدًا': return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'جيد': return 'bg-orange-50 text-orange-700 border-orange-200';
        case 'مقبول': return 'bg-yellow-50 text-yellow-800 border-yellow-200';
        case 'راسب': return 'bg-red-50 text-red-700 border-red-200';
        default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
};

/** نفس منطق قاعدة البيانات (prepare_exam_result) لعرض فوري قبل الحفظ */
export const previewResult = (criteria: ExamCriterion[], scores: Record<string, number | ''>, isAbsent: boolean, passPercent: number) => {
    if (isAbsent) return { total: 0, percent: 0, grade: 'غائب' };
    const max = criteria.reduce((s, c) => s + c.max, 0);
    const total = criteria.reduce((s, c) => s + (Number(scores[c.key]) || 0), 0);
    const percent = max ? Math.round((total / max) * 10000) / 100 : 0;
    const grade = percent < passPercent ? 'راسب' : percent >= 90 ? 'ممتاز' : percent >= 80 ? 'جيد جدًا' : percent >= 65 ? 'جيد' : 'مقبول';
    return { total, percent, grade };
};
