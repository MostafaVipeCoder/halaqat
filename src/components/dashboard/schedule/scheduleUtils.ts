import type { ScheduleSlot } from '../../../services/scheduleService';

/** ترتيب أيام الأسبوع في المدارس: من السبت للجمعة (القيم حسب Date.getDay) */
export const WEEK_DAYS: { value: number; label: string }[] = [
    { value: 6, label: 'السبت' },
    { value: 0, label: 'الأحد' },
    { value: 1, label: 'الاثنين' },
    { value: 2, label: 'الثلاثاء' },
    { value: 3, label: 'الأربعاء' },
    { value: 4, label: 'الخميس' },
    { value: 5, label: 'الجمعة' },
];

export const dayLabel = (d: number) => WEEK_DAYS.find(w => w.value === d)?.label ?? '';

/** "16:30:00" → "4:30 م" */
export const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const suffix = h < 12 ? 'ص' : 'م';
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
};

export const minutesOf = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};

export const slotMinutes = (s: Pick<ScheduleSlot, 'start_time' | 'end_time'>) => minutesOf(s.end_time) - minutesOf(s.start_time);

const overlaps = (a: ScheduleSlot, b: ScheduleSlot) =>
    a.day_of_week === b.day_of_week && minutesOf(a.start_time) < minutesOf(b.end_time) && minutesOf(b.start_time) < minutesOf(a.end_time);

/** تعارض: نفس المعلم أو نفس القاعة في وقتين متداخلين */
export const findConflicts = (slots: ScheduleSlot[], teacherOf: (s: ScheduleSlot) => string | null) => {
    const conflicts = new Map<string, string[]>();
    const add = (id: string, msg: string) => conflicts.set(id, [...(conflicts.get(id) || []), msg]);
    for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
            const a = slots[i], b = slots[j];
            if (!overlaps(a, b)) continue;
            const ta = teacherOf(a), tb = teacherOf(b);
            if (ta && ta === tb) {
                add(a.id, `المعلم مرتبط بحلقة ${b.classes?.name ?? ''} في نفس الوقت`);
                add(b.id, `المعلم مرتبط بحلقة ${a.classes?.name ?? ''} في نفس الوقت`);
            }
            if (a.room && b.room && a.room.trim() === b.room.trim()) {
                add(a.id, `القاعة ${a.room} محجوزة لحلقة ${b.classes?.name ?? ''}`);
                add(b.id, `القاعة ${b.room} محجوزة لحلقة ${a.classes?.name ?? ''}`);
            }
        }
    }
    return conflicts;
};

const PALETTE = [
    'bg-orange-50 border-orange-200',
    'bg-blue-50 border-blue-200',
    'bg-green-50 border-green-200',
    'bg-yellow-50 border-yellow-200',
    'bg-red-50 border-red-200',
    'bg-gray-50 border-gray-200',
];

/** لون ثابت لكل معلم ليسهل تتبعه في الجدول */
export const teacherColor = (key: string | null) => {
    if (!key) return PALETTE[PALETTE.length - 1];
    let hash = 0;
    for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return PALETTE[hash % (PALETTE.length - 1)];
};
