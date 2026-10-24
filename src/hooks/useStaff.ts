import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { staffService, type InvitationInput } from '../services/staffService';
import type { Permission, StaffType } from '../lib/permissions';

export const useStaff = () => {
    const queryClient = useQueryClient();
    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['staff'] });
        queryClient.invalidateQueries({ queryKey: ['staff-invitations'] });
        queryClient.invalidateQueries({ queryKey: ['classes'] });
    };

    const staffQuery = useQuery({ queryKey: ['staff'], queryFn: staffService.getStaff });
    const invitationsQuery = useQuery({ queryKey: ['staff-invitations'], queryFn: staffService.getInvitations });

    const invite = useMutation({
        mutationFn: (input: InvitationInput) => staffService.invite(input),
        onSuccess: () => { toast.success('تم تسجيل الموظف — سينضم للمدرسة عند أول دخول ببريده'); refresh(); },
        onError: (e: Error) => toast.error(e.message),
    });

    const updateInvitation = useMutation({
        mutationFn: ({ id, input }: { id: string; input: Partial<InvitationInput> }) => staffService.updateInvitation(id, input),
        onSuccess: () => { toast.success('تم تحديث بيانات الدعوة'); refresh(); },
        onError: (e: Error) => toast.error(e.message),
    });

    const revokeInvitation = useMutation({
        mutationFn: staffService.revokeInvitation,
        onSuccess: () => { toast.success('تم إلغاء الدعوة'); refresh(); },
        onError: () => toast.error('فشل إلغاء الدعوة'),
    });

    const updateStaff = useMutation({
        mutationFn: async ({ id, name, input, classIds }: {
            id: string;
            name: string;
            input: { staff_type?: StaffType; permissions?: Permission[]; is_active?: boolean };
            classIds?: string[];
        }) => {
            await staffService.updateStaff(id, input);
            if (classIds) await staffService.setTeacherClasses(id, name, classIds);
        },
        onSuccess: () => { toast.success('تم حفظ صلاحيات الموظف'); refresh(); },
        onError: () => toast.error('فشل حفظ التعديلات'),
    });

    return {
        staff: staffQuery.data || [],
        invitations: invitationsQuery.data || [],
        isLoading: staffQuery.isLoading || invitationsQuery.isLoading,
        invite: invite.mutateAsync,
        updateInvitation: updateInvitation.mutateAsync,
        revokeInvitation: revokeInvitation.mutateAsync,
        updateStaff: updateStaff.mutateAsync,
        isSaving: invite.isPending || updateInvitation.isPending || updateStaff.isPending,
    };
};

/** المعلمون (لقوائم الاختيار في الحلقات والجدول) */
export const useTeachers = () => {
    const query = useQuery({ queryKey: ['staff'], queryFn: staffService.getStaff });
    return (query.data || []).filter(s => s.staff_type === 'teacher' && s.is_active);
};
