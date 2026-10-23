import { supabase } from '../lib/supabase';
import type { Class } from '../types';

export const classService = {
    /**
     * جلب جميع الحلقات
     */
    async getAll() {
        const { data, error } = await supabase
            .from('classes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * جلب فصل واحد بواسطة ID
     */
    async getById(id: string) {
        const { data, error } = await supabase
            .from('classes')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * إضافة حلقة جديدة
     */
    /**
     * إضافة حلقة جديدة
     */
    async create(classData: Omit<Class, 'id' | 'created_at' | 'updated_at'>) {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('classes')
            .insert([{ ...classData, user_id: user.id }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * تحديث بيانات فصل
     */
    async update(id: string, classData: Partial<Class>) {
        const { data, error } = await supabase
            .from('classes')
            .update({ ...classData, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * حذف فصل
     */
    async delete(id: string) {
        const { error } = await supabase
            .from('classes')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * جلب عدد الطلاب في فصل
     */
    async getStudentCount(classId: string) {
        const { count, error } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', classId);

        if (error) throw error;
        return count || 0;
    }
};
