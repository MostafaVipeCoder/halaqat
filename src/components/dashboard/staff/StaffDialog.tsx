import { useEffect, useState } from 'react';
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Checkbox } from '../../ui/checkbox';
import { Switch } from '../../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { toast } from 'sonner';
import { PERMISSION_GROUPS, STAFF_TYPES, type Permission, type StaffType } from '../../../lib/permissions';

export interface StaffFormValue {
    full_name: string;
    email: string;
    staff_type: StaffType;
    permissions: Permission[];
    class_ids: string[];
    is_active: boolean;
}

interface StaffDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'invite' | 'edit-invite' | 'edit-staff';
    initial?: Partial<StaffFormValue>;
    classes: { id: string; name: string; teacher_id?: string | null }[];
    /** المعلم الحالي (عند التعديل) لتمييز حلقاته عن حلقات معلمين آخرين */
    staffId?: string;
    onSubmit: (value: StaffFormValue) => Promise<unknown>;
    isSaving?: boolean;
}

const EMPTY: StaffFormValue = {
    full_name: '', email: '', staff_type: 'teacher',
    permissions: STAFF_TYPES[0].preset, class_ids: [], is_active: true,
};

export default function StaffDialog({ open, onOpenChange, mode, initial, classes, staffId, onSubmit, isSaving }: StaffDialogProps) {
    const [form, setForm] = useState<StaffFormValue>(EMPTY);

    useEffect(() => {
        if (open) setForm({ ...EMPTY, ...initial });
    }, [open, initial]);

    const setType = (staff_type: StaffType) => {
        const preset = STAFF_TYPES.find(t => t.value === staff_type)?.preset ?? [];
        setForm(f => ({ ...f, staff_type, permissions: [...preset], class_ids: staff_type === 'teacher' ? f.class_ids : [] }));
    };

    const togglePermission = (key: Permission, checked: boolean) =>
        setForm(f => ({ ...f, permissions: checked ? [...new Set([...f.permissions, key])] : f.permissions.filter(p => p !== key) }));

    const toggleClass = (id: string) =>
        setForm(f => ({ ...f, class_ids: f.class_ids.includes(id) ? f.class_ids.filter(c => c !== id) : [...f.class_ids, id] }));

    const handleSubmit = async () => {
        if (!form.full_name.trim()) return toast.error('اكتب اسم الموظف');
        if (mode === 'invite' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return toast.error('اكتب بريدًا إلكترونيًا صحيحًا');
        if (form.permissions.length === 0) return toast.error('اختر صلاحية واحدة على الأقل');
        try {
            await onSubmit({ ...form, full_name: form.full_name.trim(), email: form.email.trim() });
            onOpenChange(false);
        } catch {
            // الرسالة تظهر من الـ hook
        }
    };

    const title = mode === 'invite' ? 'إضافة موظف' : 'تعديل الموظف وصلاحياته';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="mz sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl" onInteractOutside={(e: any) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {mode === 'invite'
                            ? 'سجّل بريد الموظف وصلاحياته. سينضم للمدرسة تلقائيًا عند أول دخول بهذا البريد (بحساب Google أو بإنشاء حساب).'
                            : 'عدّل الوظيفة والصلاحيات في أي وقت، وتطبَّق فورًا.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-5 py-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="staff-name">الاسم *</Label>
                            <Input id="staff-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="staff-email">البريد الإلكتروني *</Label>
                            <Input id="staff-email" type="email" dir="ltr" value={form.email} disabled={mode !== 'invite'}
                                onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@gmail.com" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                        <div className="space-y-2">
                            <Label htmlFor="staff-type">الوظيفة</Label>
                            <Select value={form.staff_type} onValueChange={(v: StaffType) => setType(v)}>
                                <SelectTrigger id="staff-type"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {STAFF_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500">اختيار الوظيفة يضبط صلاحيات مقترحة، ويمكنك تعديلها بالأسفل.</p>
                        </div>
                        {mode === 'edit-staff' && (
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <div>
                                    <Label htmlFor="staff-active">الحساب نشط</Label>
                                    <p className="text-xs text-gray-500">الإيقاف يمنع الموظف من أي إجراء دون حذف بياناته</p>
                                </div>
                                <Switch id="staff-active" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                            </div>
                        )}
                    </div>

                    {form.staff_type === 'teacher' && (
                        <div className="space-y-2">
                            <Label>حلقات المعلم</Label>
                            <p className="text-xs text-gray-500">المعلم يرى ويسجّل لطلاب هذه الحلقات فقط. اختيار حلقة مع معلم آخر ينقلها لهذا المعلم.</p>
                            <div className="flex flex-wrap gap-2">
                                {classes.length === 0 && <span className="text-sm text-gray-500">لا توجد حلقات بعد.</span>}
                                {classes.map(c => {
                                    const selected = form.class_ids.includes(c.id);
                                    const taken = !!c.teacher_id && c.teacher_id !== staffId && !selected;
                                    return (
                                        <button key={c.id} type="button" aria-pressed={selected} onClick={() => toggleClass(c.id)}
                                            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${selected
                                                ? 'bg-orange-500 text-white border-orange-500'
                                                : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300'}`}
>
                                            {c.name}{taken ? ' (مع معلم آخر)' : ''}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <Label>الصلاحيات</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {PERMISSION_GROUPS.map(group => (
                                <fieldset key={group.title} className="rounded-lg border p-3 space-y-2">
                                    <legend className="px-1 text-sm font-semibold text-gray-700">{group.title}</legend>
                                    {group.items.map(item => (
                                        <label key={item.key} className="flex items-start gap-2 cursor-pointer">
                                            <Checkbox
                                                checked={form.permissions.includes(item.key)}
                                                onCheckedChange={(v) => togglePermission(item.key, v === true)}
                                                aria-label={item.label}
                                                className="mt-0.5"
                                            />
                                            <span>
                                                <span className="block text-sm text-gray-900">{item.label}</span>
                                                <span className="block text-xs text-gray-500">{item.hint}</span>
                                            </span>
                                        </label>
                                    ))}
                                </fieldset>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
                    <Button onClick={handleSubmit} disabled={isSaving} className="bg-orange-500 hover:bg-orange-600 text-white">
                        {isSaving ? 'جاري الحفظ...' : mode === 'invite' ? 'إضافة الموظف' : 'حفظ التعديلات'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
