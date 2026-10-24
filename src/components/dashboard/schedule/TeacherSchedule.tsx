import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, Clock, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import ScheduleSlotDialog from './ScheduleSlotDialog';
import { WEEK_DAYS, findConflicts, formatTime, slotMinutes, teacherColor } from './scheduleUtils';
import { useSchedule } from '../../../hooks/useSchedule';
import { useClasses } from '../../../hooks/useClasses';
import { useStaff } from '../../../hooks/useStaff';
import { useCurrentProfile } from '../../../hooks/useCurrentProfile';
import type { ScheduleSlot } from '../../../services/scheduleService';

export default function TeacherSchedule() {
    const { slots, isLoading, createSlots, updateSlot, deleteSlot, isSaving } = useSchedule();
    const { classes } = useClasses();
    const { staff } = useStaff();
    const { profile, can, isTeacher } = useCurrentProfile();
    const canEdit = can('classes.manage');

    const teachers = staff.filter(s => s.staff_type === 'teacher' && s.is_active);
    const [teacherFilter, setTeacherFilter] = useState<string>('all');
    const [classFilter, setClassFilter] = useState<string>('all');
    const [dialogSlot, setDialogSlot] = useState<ScheduleSlot | null | undefined>(undefined);

    // المعلم الفعلي للموعد: المحدد في الموعد، وإلا معلم الحلقة
    const teacherIdOf = (s: ScheduleSlot) => s.teacher_id ?? s.classes?.teacher_id ?? null;
    const teacherName = (s: ScheduleSlot) => {
        const id = teacherIdOf(s);
        return staff.find(t => t.id === id)?.full_name ?? s.classes?.teacher_name ?? 'بدون معلم';
    };
    const teacherKey = (s: ScheduleSlot) => teacherIdOf(s) ?? (s.classes?.teacher_name || null);

    const effectiveTeacherFilter = isTeacher && teacherFilter === 'all' && profile ? profile.id : teacherFilter;

    const visible = useMemo(() => slots.filter(s =>
        (effectiveTeacherFilter === 'all' || teacherIdOf(s) === effectiveTeacherFilter)
        && (classFilter === 'all' || s.class_id === classFilter)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    ), [slots, effectiveTeacherFilter, classFilter]);

    const conflicts = useMemo(() => findConflicts(slots, teacherKey), [slots, staff]); // eslint-disable-line react-hooks/exhaustive-deps

    const weeklyLoad = useMemo(() => {
        const load = new Map<string, { name: string; minutes: number; halaqat: Set<string> }>();
        for (const s of slots) {
            const key = teacherKey(s) ?? '—';
            const row = load.get(key) ?? { name: teacherName(s), minutes: 0, halaqat: new Set<string>() };
            row.minutes += slotMinutes(s);
            row.halaqat.add(s.classes?.name ?? '');
            load.set(key, row);
        }
        return [...load.values()].sort((a, b) => b.minutes - a.minutes);
    }, [slots, staff]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleDelete = async (s: ScheduleSlot) => {
        if (window.confirm(`حذف موعد ${s.classes?.name ?? ''}؟`)) await deleteSlot(s.id);
    };

    return (
        <div className="mz space-y-6" dir="rtl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">{isTeacher ? 'جدولي' : 'جدول المعلمين'}</h1>
                    <p className="text-gray-600 mt-1">مواعيد الحلقات الأسبوعية لكل معلم وقاعة</p>
                </div>
                {canEdit && (
                    <Button onClick={() => setDialogSlot(null)} className="bg-orange-500 hover:bg-orange-600 text-white">
                        <Plus className="h-4 w-4 ml-2" /> إضافة مواعيد
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                <Select value={teacherFilter} onValueChange={setTeacherFilter}>
                    <SelectTrigger aria-label="المعلم"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{isTeacher ? 'جدولي' : 'كل المعلمين'}</SelectItem>
                        {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={classFilter} onValueChange={setClassFilter}>
                    <SelectTrigger aria-label="الحلقة"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">كل الحلقات</SelectItem>
                        {classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-16">
                    <div className="h-8 w-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                </div>
            ) : slots.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center text-center py-12 gap-3">
                        <CalendarDays className="h-10 w-10 text-gray-300" />
                        <p className="text-gray-600">لا توجد مواعيد في الجدول بعد.</p>
                        {canEdit && (
                            <Button onClick={() => setDialogSlot(null)} className="bg-orange-500 hover:bg-orange-600 text-white">
                                <Plus className="h-4 w-4 ml-2" /> إضافة أول موعد
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
                    {WEEK_DAYS.map(day => {
                        const daySlots = visible.filter(s => s.day_of_week === day.value);
                        return (
                            <div key={day.value} className="rounded-xl border border-gray-200 bg-white">
                                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                                    <span className="font-semibold text-gray-900">{day.label}</span>
                                    <span className="text-xs text-gray-500">{daySlots.length || ''}</span>
                                </div>
                                <div className="p-2 space-y-2 min-h-24">
                                    {daySlots.length === 0 && <p className="text-xs text-gray-500 text-center py-4">لا حلقات</p>}
                                    {daySlots.map(s => {
                                        const issues = conflicts.get(s.id);
                                        return (
                                            <div key={s.id} className={`rounded-lg border p-2 text-sm ${teacherColor(teacherKey(s))}`}>
                                                <p className="font-semibold text-gray-900">{s.classes?.name}</p>
                                                <p className="text-xs text-gray-700">{teacherName(s)}</p>
                                                <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                                                    <Clock className="h-3 w-3" />{formatTime(s.start_time)} – {formatTime(s.end_time)}
                                                </p>
                                                {s.room && (
                                                    <p className="text-xs text-gray-600 flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />{s.room}
                                                    </p>
                                                )}
                                                {issues && (
                                                    <p className="text-xs text-red-700 flex items-start gap-1 mt-1" title={issues.join('\n')}>
                                                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />{issues[0]}
                                                    </p>
                                                )}
                                                {canEdit && (
                                                    <div className="flex gap-1 mt-1">
                                                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setDialogSlot(s)} aria-label="تعديل">
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleDelete(s)} aria-label="حذف">
                                                            <Trash2 className="h-3.5 w-3.5 text-red-600" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!isTeacher && weeklyLoad.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">نصاب المعلمين الأسبوعي</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="divide-y divide-gray-100">
                            {weeklyLoad.map(row => (
                                <div key={row.name} className="flex items-center justify-between py-2 text-sm">
                                    <span className="font-medium text-gray-900">{row.name}</span>
                                    <span className="text-gray-600">
                                        {Math.round((row.minutes / 60) * 10) / 10} ساعة · {[...row.halaqat].filter(Boolean).join('، ')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <ScheduleSlotDialog
                open={dialogSlot !== undefined}
                onOpenChange={(o) => !o && setDialogSlot(undefined)}
                slot={dialogSlot ?? null}
                classes={classes as any}
                teachers={teachers}
                onCreate={createSlots}
                onUpdate={(id, slot) => updateSlot({ id, slot })}
                isSaving={isSaving}
            />
        </div>
    );
}
