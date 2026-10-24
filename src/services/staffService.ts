import { supabase } from '../lib/supabase';
import type { Permission, StaffType } from '../lib/permissions';

export interface StaffMember {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    role: string;
    staff_type: StaffType | null;
    permissions: Permission[];
    is_active: boolean;
    created_at: string;
}

export interface StaffInvitation {
    id: string;
    email: string;
    full_name: string;
    staff_type: StaffType;
    permissions: Permission[];
    class_ids: string[];
    status: 'pending' | 'accepted' | 'revoked';
    created_at: string;
}

export interface InvitationInput {
    email: string;
    full_name: string;
    staff_type: StaffType;
    permissions: Permission[];
    class_ids: string[];
}

const friendlyError = (error: { message?: string }) => {
    if (error.message?.includes('EMAIL_ALREADY_REGISTERED')) {
        return new Error('هذا البريد مسجّل بالفعل في المنصة. يجب أن يكون للموظف بريد غير مستخدم.');
    }
    if (error.message?.includes('idx_staff_invitations_pending_email')) {
        return new Error('يوجد بالفعل دعوة معلّقة لهذا البريد.');
    }
    return new Error(error.message || 'حدث خطأ غير متوقع');
};

export const staffService = {
    /** موظفو المدرسة (بدون المدير) */
    async getStaff() {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone, role, staff_type, permissions, is_active, created_at')
            .eq('role', 'staff')
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data as StaffMember[];
    },

    async getInvitations() {
        const { data, error } = await supabase
            .from('staff_invitations')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data as StaffInvitation[];
    },

    /** تسجيل بريد الموظف — ينضم للمدرسة تلقائيًا عند أول تسجيل دخول بهذا البريد */
    async invite(input: InvitationInput) {
        const { data, error } = await supabase
            .from('staff_invitations')
            .insert([input])
            .select()
            .single();
        if (error) throw friendlyError(error);
        return data as StaffInvitation;
    },

    async updateInvitation(id: string, input: Partial<InvitationInput>) {
        const { error } = await supabase.from('staff_invitations').update(input).eq('id', id);
        if (error) throw friendlyError(error);
    },

    async revokeInvitation(id: string) {
        const { error } = await supabase.from('staff_invitations').update({ status: 'revoked' }).eq('id', id);
        if (error) throw error;
    },

    async updateStaff(id: string, input: { staff_type?: StaffType; permissions?: Permission[]; is_active?: boolean; full_name?: string }) {
        const { error } = await supabase.from('profiles').update(input).eq('id', id);
        if (error) throw error;
    },

    /** ربط المعلم بحلقاته (يُلغي ربط الحلقات التي لم تعد مختارة) */
    async setTeacherClasses(teacherId: string, teacherName: string, classIds: string[]) {
        const { error: clearError } = await supabase
            .from('classes')
            .update({ teacher_id: null })
            .eq('teacher_id', teacherId)
            .not('id', 'in', `(${classIds.length ? classIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);
        if (clearError) throw clearError;
        if (classIds.length) {
            const { error } = await supabase
                .from('classes')
                .update({ teacher_id: teacherId, teacher_name: teacherName })
                .in('id', classIds);
            if (error) throw error;
        }
    },
};
