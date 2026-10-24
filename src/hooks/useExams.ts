import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { examService, type ExamInput, type ResultInput } from '../services/examService';
import type { ExamStatus } from '../types';

export const useExams = () => {
    const queryClient = useQueryClient();
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['exams'] });

    const examsQuery = useQuery({ queryKey: ['exams'], queryFn: examService.getExams });
    const summariesQuery = useQuery({ queryKey: ['exams', 'summaries'], queryFn: examService.getResultSummaries });

    const create = useMutation({
        mutationFn: (input: ExamInput) => examService.createExam(input),
        onSuccess: () => { toast.success('تم إنشاء الامتحان كمسودة'); refresh(); },
        onError: (e: Error) => toast.error(e.message),
    });

    return {
        exams: examsQuery.data || [],
        summaries: summariesQuery.data || [],
        isLoading: examsQuery.isLoading,
        createExam: create.mutateAsync,
        isCreating: create.isPending,
    };
};

export const useExam = (id?: string) => {
    const queryClient = useQueryClient();
    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['exams'] });
        queryClient.invalidateQueries({ queryKey: ['exam', id] });
    };

    const examQuery = useQuery({ queryKey: ['exam', id], queryFn: () => examService.getExam(id!), enabled: !!id });
    const resultsQuery = useQuery({ queryKey: ['exam', id, 'results'], queryFn: () => examService.getResults(id!), enabled: !!id });
    const changesQuery = useQuery({ queryKey: ['exam', id, 'changes'], queryFn: () => examService.getChanges(id!), enabled: !!id });

    const update = useMutation({
        mutationFn: (input: Partial<ExamInput> & { status?: ExamStatus }) => examService.updateExam(id!, input),
        onSuccess: () => refresh(),
        onError: (e: Error) => toast.error(e.message),
    });

    const remove = useMutation({
        mutationFn: () => examService.deleteExam(id!),
        onSuccess: () => { toast.success('تم حذف الامتحان'); queryClient.invalidateQueries({ queryKey: ['exams'] }); },
        onError: (e: Error) => toast.error(e.message),
    });

    const save = useMutation({
        mutationFn: (rows: ResultInput[]) => examService.saveResults(rows),
        onSuccess: (_d, rows) => { toast.success(rows.length === 1 ? 'تم حفظ الدرجة' : `تم حفظ ${rows.length} درجات`); refresh(); },
        onError: (e: Error) => toast.error(e.message),
    });

    return {
        exam: examQuery.data ?? null,
        results: resultsQuery.data || [],
        changes: changesQuery.data || [],
        isLoading: examQuery.isLoading || resultsQuery.isLoading,
        updateExam: update.mutateAsync,
        deleteExam: remove.mutateAsync,
        saveResults: save.mutateAsync,
        isSaving: save.isPending,
    };
};

export const useStudentExamResults = (studentId?: string) => {
    const query = useQuery({
        queryKey: ['exam-results', 'student', studentId],
        queryFn: () => examService.getStudentResults(studentId!),
        enabled: !!studentId,
    });
    return { results: query.data || [], isLoading: query.isLoading };
};
