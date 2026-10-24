import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { WEEK_DAYS } from './scheduleUtils';
import type { ScheduleSlot, ScheduleSlotInput } from '../../../services/scheduleService';

interface ScheduleSlotDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    slot: ScheduleSlot | null;
    classes: { id: string; name: string; teacher_id?: string | null }[];
    teachers: { id: string; full_name: string | null }[];
    onCreate: (slots: ScheduleSlotInput[]) => Promise<unknown>;
    onUpdate: (id: string, slot: Partial<ScheduleSlotInput>) => Promise<unknown>;
    isSaving?: boolean;
}

const CLASS_TEACHER = '__class_teacher__';

export default function ScheduleSlotDialog({ open, onOpenChange, slot, classes, teachers, onCreate, onUpdate, isSaving }: ScheduleSlotDialogProps) {
    const [classId, setClassId] = useState('');
    const [teacherId, setTeacherId] = useState(CLASS_TEACHER);
    const [days, setDays] = useState<number[]>([]);
    const [start, setStart] = useState('16:00');
    const [end, setEnd] = useState('17:30');
    const [room, setRoom] = useState('');

    useEffect(() => {
        if (!open) return;
        setClassId(slot?.class_id ?? '');
        setTeacherId(slot?.teacher_id ?? CLASS_TEACHER);
        setDays(slot ? [slot.day_of_week] : []);
        setStart(slot?.start_time.slice(0, 5) ?? '16:00');
        setEnd(slot?.end_time.slice(0, 5) ?? '17:30');
        setRoom(slot?.room ?? '');
    }, [open, slot]);

    const toggleDay = (d: number) => setDays(prev => (slot ? [d] : prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]));

    const handleSave = async () => {
        if (!classId) return toast.error('اختر الحلقة');
        if (days.length === 0) return toast.error('اختر يومًا واحدًا على الأقل');
        if (end <= start) return toast.error('وقت النهاية يجب أن يكون بعد وقت البداية');
        const base = {
            class_id: classId,
            teacher_id: teacherId === CLASS_TEACHER ? null : teacherId,
            start_time: start,
            end_time: end,
            room: room.trim() || null,
            notes: null,
        };
        try {
            if (slot) await onUpdate(slot.id, { ...base, day_of_week: days[0] });
            else await onCreate(days.map(day_of_week => ({ ...base, day_of_week })));
            onOpenChange(false);
        } catch {
            // الرسالة تظهر من الـ hook
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="mz sm:max-w-lg" dir="rtl" onInteractOutside={(e: any) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>{slot ? 'تعديل موعد' : 'إضافة مواعيد للجدول'}</DialogTitle>
                    <DialogDescription>{slot ? 'عدّل موعد الحلقة في هذا اليوم' : 'اختر الحلقة والأيام والوقت — يُضاف موعد لكل يوم مختار'}</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="slot-class">الحلقة *</Label>
                            <Select value={classId} onValueChange={setClassId}>
                                <SelectTrigger id="slot-class"><SelectValue placeholder="اختر الحلقة" /></SelectTrigger>
                                <SelectContent>
                                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="slot-teacher">المعلم</Label>
                            <Select value={teacherId} onValueChange={setTeacherId}>
                                <SelectTrigger id="slot-teacher"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={CLASS_TEACHER}>معلم الحلقة</SelectItem>
                                    {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{slot ? 'اليوم' : 'الأيام *'}</Label>
                        <div className="flex flex-wrap gap-2">
                            {WEEK_DAYS.map(d => (
                                <button key={d.value} type="button" aria-pressed={days.includes(d.value)} onClick={() => toggleDay(d.value)}
                                    className={`px-3 py-1.5 rounded-lg text-sm border ${days.includes(d.value)
                                        ? 'bg-orange-500 text-white border-orange-500'
                                        : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300'}`}>
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="slot-start">من *</Label>
                            <Input id="slot-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="slot-end">إلى *</Label>
                            <Input id="slot-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="slot-room">القاعة</Label>
                            <Input id="slot-room" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="اختياري" />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-orange-500 hover:bg-orange-600 text-white">
                        {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
