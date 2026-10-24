import { useMemo, useState } from 'react';
import { Clock, Pencil, Plus, ShieldCheck, UserCog, Users, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import KPICard from '../KPICard';
import StaffDialog, { type StaffFormValue } from './StaffDialog';
import { useStaff } from '../../../hooks/useStaff';
import { useClasses } from '../../../hooks/useClasses';
import { permissionLabel, staffTypeLabel } from '../../../lib/permissions';
import type { StaffInvitation, StaffMember } from '../../../services/staffService';

type DialogState =
    | { mode: 'invite' }
    | { mode: 'edit-invite'; invitation: StaffInvitation }
    | { mode: 'edit-staff'; member: StaffMember };

export default function Staff() {
    const { staff, invitations, isLoading, invite, updateInvitation, revokeInvitation, updateStaff, isSaving } = useStaff();
    const { classes } = useClasses();
    const [dialog, setDialog] = useState<DialogState | null>(null);

    const classesOf = (teacherId: string) => classes.filter((c: any) => c.teacher_id === teacherId);
    const classNames = (ids: string[]) => classes.filter((c: any) => ids.includes(c.id)).map((c: any) => c.name);

    const initial = useMemo<Partial<StaffFormValue> | undefined>(() => {
        if (!dialog || dialog.mode === 'invite') return undefined;
        if (dialog.mode === 'edit-invite') {
            const i = dialog.invitation;
            return { full_name: i.full_name, email: i.email, staff_type: i.staff_type, permissions: i.permissions, class_ids: i.class_ids };
        }
        const m = dialog.member;
        return {
            full_name: m.full_name ?? '', email: m.email ?? '', staff_type: m.staff_type ?? 'custom',
            permissions: m.permissions, is_active: m.is_active,
            class_ids: classesOf(m.id).map((c: any) => c.id),
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialog]);

    const handleSubmit = async (value: StaffFormValue) => {
        if (!dialog) return;
        if (dialog.mode === 'invite') {
            await invite({ email: value.email, full_name: value.full_name, staff_type: value.staff_type, permissions: value.permissions, class_ids: value.class_ids });
        } else if (dialog.mode === 'edit-invite') {
            await updateInvitation({ id: dialog.invitation.id, input: { full_name: value.full_name, staff_type: value.staff_type, permissions: value.permissions, class_ids: value.class_ids } });
        } else {
            await updateStaff({
                id: dialog.member.id,
                name: value.full_name,
                input: { staff_type: value.staff_type, permissions: value.permissions, is_active: value.is_active },
                classIds: value.staff_type === 'teacher' ? value.class_ids : [],
            });
        }
    };

    const activeCount = staff.filter(s => s.is_active).length;
    const teachersCount = staff.filter(s => s.staff_type === 'teacher' && s.is_active).length;

    return (
        <div className="mz space-y-6" dir="rtl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">الموظفون والصلاحيات</h1>
                    <p className="text-gray-600 mt-1">أضف موظفي المدرسة وحدّد ما يستطيع كل منهم رؤيته وفعله</p>
                </div>
                <Button onClick={() => setDialog({ mode: 'invite' })} className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة موظف
                </Button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <KPICard label="الموظفون النشطون" value={activeCount} icon={Users} color="orange" />
                <KPICard label="المعلمون" value={teachersCount} icon={UserCog} color="blue" />
                <KPICard label="بانتظار أول دخول" value={invitations.length} icon={Clock} color="red" />
            </div>

            {invitations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">بانتظار أول دخول</CardTitle>
                        <CardDescription>ينضم الموظف تلقائيًا عندما يدخل للمنصة بنفس البريد المسجّل</CardDescription>
                    </CardHeader>
                    <CardContent className="divide-y divide-gray-100">
                        {invitations.map(inv => (
                            <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3">
                                <div className="min-w-0">
                                    <p className="font-medium">{inv.full_name} <span className="text-sm text-gray-500">· {staffTypeLabel(inv.staff_type)}</span></p>
                                    <p className="text-sm text-gray-500" dir="ltr" style={{ textAlign: 'right' }}>{inv.email}</p>
                                    {inv.class_ids.length > 0 && <p className="text-xs text-gray-500 mt-1">الحلقات: {classNames(inv.class_ids).join('، ')}</p>}
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <Button size="sm" variant="outline" onClick={() => setDialog({ mode: 'edit-invite', invitation: inv })}>
                                        <Pencil className="h-4 w-4 ml-1" /> تعديل
                                    </Button>
                                    <Button size="sm" variant="outline" className="text-red-700 border-red-200 hover:bg-red-50"
                                        onClick={() => window.confirm(`إلغاء دعوة ${inv.full_name}؟`) && revokeInvitation(inv.id)}>
                                        <X className="h-4 w-4 ml-1" /> إلغاء
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">موظفو المدرسة</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <div className="h-8 w-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                        </div>
                    ) : staff.length === 0 ? (
                        <div className="flex flex-col items-center text-center py-10 gap-3">
                            <ShieldCheck className="h-10 w-10 text-gray-300" />
                            <p className="text-gray-600">لم تُضف موظفين بعد. ابدأ بإضافة المحفّظين أو المحاسب أو مسؤول الكونترول.</p>
                            <Button onClick={() => setDialog({ mode: 'invite' })} className="bg-orange-500 hover:bg-orange-600 text-white">
                                <Plus className="h-4 w-4 ml-2" /> إضافة أول موظف
                            </Button>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {staff.map(member => {
                                const memberClasses = classesOf(member.id);
                                return (
                                    <div key={member.id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 py-4">
                                        <div className="min-w-0 space-y-1.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-medium text-gray-900">{member.full_name || member.email}</span>
                                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">{staffTypeLabel(member.staff_type)}</Badge>
                                                {!member.is_active && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">موقوف</Badge>}
                                            </div>
                                            <p className="text-sm text-gray-500" dir="ltr" style={{ textAlign: 'right' }}>{member.email}</p>
                                            {memberClasses.length > 0 && (
                                                <p className="text-xs text-gray-600">الحلقات: {memberClasses.map((c: any) => c.name).join('، ')}</p>
                                            )}
                                            <div className="flex flex-wrap gap-1.5">
                                                {member.permissions.map(p => (
                                                    <span key={p} className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">{permissionLabel(p)}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <Button size="sm" variant="outline" className="shrink-0" onClick={() => setDialog({ mode: 'edit-staff', member })}>
                                            <Pencil className="h-4 w-4 ml-1" /> تعديل الصلاحيات
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <StaffDialog
                open={!!dialog}
                onOpenChange={(o) => !o && setDialog(null)}
                mode={dialog?.mode ?? 'invite'}
                initial={initial}
                classes={classes as any}
                staffId={dialog?.mode === 'edit-staff' ? dialog.member.id : undefined}
                onSubmit={handleSubmit}
                isSaving={isSaving}
            />
        </div>
    );
}
