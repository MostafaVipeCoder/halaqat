import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memorizationService } from '../services/memorizationService';
import { toast } from 'sonner';

export const useRecitationSessions = ({ enabled = true, ...filters }: { studentId?: string; fromDate?: string; toDate?: string; enabled?: boolean } = {}) => {
    const queryClient = useQueryClient();

    const sessionsQuery = useQuery({
        queryKey: ['recitations', filters],
        queryFn: () => memorizationService.getSessions(filters),
        enabled,
    });

    const addSessionMutation = useMutation({
        mutationFn: memorizationService.createSession,
        onSuccess: () => {
            toast.success('تم تسجيل التسميع بنجاح');
            queryClient.invalidateQueries({ queryKey: ['recitations'] });
        },
        onError: (error) => {
            console.error(error);
            toast.error('فشل تسجيل التسميع');
        }
    });

    const deleteSessionMutation = useMutation({
        mutationFn: memorizationService.deleteSession,
        onSuccess: () => {
            toast.success('تم حذف جلسة التسميع');
            queryClient.invalidateQueries({ queryKey: ['recitations'] });
        },
        onError: () => {
            toast.error('فشل حذف جلسة التسميع');
        }
    });

    return {
        sessions: sessionsQuery.data || [],
        isLoading: sessionsQuery.isLoading,
        isError: sessionsQuery.isError,
        addSession: addSessionMutation.mutateAsync,
        isAdding: addSessionMutation.isPending,
        deleteSession: deleteSessionMutation.mutateAsync,
    };
};

export const useMemorizationPlan = (studentId?: string) => {
    const queryClient = useQueryClient();

    const planQuery = useQuery({
        queryKey: ['memorization-plan', studentId],
        queryFn: () => memorizationService.getPlan(studentId!),
        enabled: !!studentId,
    });

    const savePlanMutation = useMutation({
        mutationFn: memorizationService.savePlan,
        onSuccess: () => {
            toast.success('تم حفظ خطة الحفظ');
            queryClient.invalidateQueries({ queryKey: ['memorization-plan'] });
        },
        onError: (error) => {
            console.error(error);
            toast.error('فشل حفظ خطة الحفظ');
        }
    });

    return {
        plan: planQuery.data ?? null,
        isLoading: planQuery.isLoading,
        savePlan: savePlanMutation.mutateAsync,
        isSaving: savePlanMutation.isPending,
    };
};
