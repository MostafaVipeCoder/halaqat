import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { scheduleService, type ScheduleSlotInput } from '../services/scheduleService';

export const useSchedule = () => {
    const queryClient = useQueryClient();
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['schedule'] });

    const query = useQuery({ queryKey: ['schedule'], queryFn: scheduleService.getAll });

    const create = useMutation({
        mutationFn: (slots: ScheduleSlotInput[]) => scheduleService.create(slots),
        onSuccess: () => { toast.success('تمت إضافة المواعيد للجدول'); refresh(); },
        onError: () => toast.error('فشل حفظ الموعد — تأكد أن وقت النهاية بعد وقت البداية'),
    });
    const update = useMutation({
        mutationFn: ({ id, slot }: { id: string; slot: Partial<ScheduleSlotInput> }) => scheduleService.update(id, slot),
        onSuccess: () => { toast.success('تم تعديل الموعد'); refresh(); },
        onError: () => toast.error('فشل تعديل الموعد'),
    });
    const remove = useMutation({
        mutationFn: scheduleService.delete,
        onSuccess: () => { toast.success('تم حذف الموعد'); refresh(); },
        onError: () => toast.error('فشل حذف الموعد'),
    });

    return {
        slots: query.data || [],
        isLoading: query.isLoading,
        createSlots: create.mutateAsync,
        updateSlot: update.mutateAsync,
        deleteSlot: remove.mutateAsync,
        isSaving: create.isPending || update.isPending,
    };
};
