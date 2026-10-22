import { supabase } from '../lib/supabase';
import type { MemorizationPlan, RecitationSession } from '../types';

export type NewRecitationSession = Omit<RecitationSession, 'id' | 'school_id' | 'created_at' | 'recorded_by' | 'students'>;
export type MemorizationPlanInput = Omit<MemorizationPlan, 'id' | 'school_id' | 'created_at' | 'updated_at'>;

export const memorizationService = {
    /**
     * جلب جلسات التسميع (لطالب واحد أو لكل المدرسة) مع بيانات الطالب
     */
    async getSessions(filters: { studentId?: string; fromDate?: string; toDate?: string } = {}) {
        let query = supabase
            .from('recitation_sessions')
            .select(`
                *,
                students (
                    id,
                    name,
                    class_id,
                    classes (
                        name
                    )
                )
            `)
            .order('session_date', { ascending: false })
            .order('created_at', { ascending: false });

        if (filters.studentId) query = query.eq('student_id', filters.studentId);
        if (filters.fromDate) query = query.gte('session_date', filters.fromDate);
        if (filters.toDate) query = query.lte('session_date', filters.toDate);

        const { data, error } = await query;
        if (error) throw error;
        return data as RecitationSession[];
    },

    /**
     * تسجيل جلسة تسميع جديدة (school_id يُملأ تلقائيًا من الطالب عبر trigger)
     */
    async createSession(session: NewRecitationSession) {
        const { data, error } = await supabase
            .from('recitation_sessions')
            .insert([session])
            .select()
            .single();

        if (error) throw error;
        return data as RecitationSession;
    },

    async deleteSession(id: string) {
        const { error } = await supabase
            .from('recitation_sessions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * جلب خطة حفظ الطالب (قد لا توجد بعد)
     */
    async getPlan(studentId: string) {
        const { data, error } = await supabase
            .from('memorization_plans')
            .select('*')
            .eq('student_id', studentId)
            .maybeSingle();

        if (error) throw error;
        return data as MemorizationPlan | null;
    },

    /**
     * إنشاء أو تحديث خطة الحفظ (خطة واحدة لكل طالب)
     */
    async savePlan(plan: MemorizationPlanInput) {
        const { data, error } = await supabase
            .from('memorization_plans')
            .upsert([plan], { onConflict: 'student_id' })
            .select()
            .single();

        if (error) throw error;
        return data as MemorizationPlan;
    },
};
