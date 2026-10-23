
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classService, Class } from '../services/classService';
import { toast } from 'sonner';

export const useClasses = () => {
    const queryClient = useQueryClient();

    const classesQuery = useQuery({
        queryKey: ['classes'],
        queryFn: async () => {
            // Parallel data fetching for classes and their counts
            const classesData = await classService.getAll();
            const classesWithCounts = await Promise.all(
                classesData.map(async (cls) => {
                    const count = await classService.getStudentCount(cls.id || '');
                    return { ...cls, currentStudents: count };
                })
            );
            return classesWithCounts;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const addClassMutation = useMutation({
        mutationFn: classService.create,
        // Optimistic Update
        onMutate: async (newClass) => {
            await queryClient.cancelQueries({ queryKey: ['classes'] });
            const previousClasses = queryClient.getQueryData<Class[]>(['classes']);

            queryClient.setQueryData<Class[]>(['classes'], (old) => {
                const tempId = Math.random().toString();
                const optimisticClass: Class = {
                    ...newClass,
                    id: tempId,
                    currentStudents: 0,
                    created_at: new Date().toISOString()
                } as Class;
                return old ? [optimisticClass, ...old] : [optimisticClass];
            });

            return { previousClasses };
        },
        onError: (err, newClass, context) => {
            toast.error('فشل إضافة الحلقة');
            if (context?.previousClasses) {
                queryClient.setQueryData(['classes'], context.previousClasses);
            }
        },
        onSuccess: () => {
            toast.success('تم إضافة الحلقة بنجاح');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            // Invalidate grades query too as class count changes
            queryClient.invalidateQueries({ queryKey: ['grades'] });
        },
    });

    const updateClassMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Class> }) =>
            classService.update(id, data),
        onSuccess: () => {
            toast.success('تم تعديل بيانات الحلقة بنجاح');
            queryClient.invalidateQueries({ queryKey: ['classes'] });
        },
        onError: () => {
            toast.error('فشل تعديل بيانات الحلقة');
        }
    });

    const deleteClassMutation = useMutation({
        mutationFn: classService.delete,
        onSuccess: () => {
            toast.success('تم حذف الحلقة بنجاح');
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            queryClient.invalidateQueries({ queryKey: ['grades'] });
        },
        onError: (error: any) => {
            if (error?.code === '23503') {
                toast.error('لا يمكن حذف هذه الحلقة لأنها تحتوي على طلاب مسجلين');
            } else {
                toast.error('فشل حذف الحلقة');
            }
        }
    });

    return {
        classes: classesQuery.data || [],
        isLoading: classesQuery.isLoading,
        isError: classesQuery.isError,
        addClass: addClassMutation.mutateAsync,
        updateClass: updateClassMutation.mutateAsync,
        deleteClass: deleteClassMutation.mutateAsync,
    };
};
