import { supabase } from '../lib/supabase';

export interface SchoolSettings {
    id?: string;
    user_id?: string;
    school_name: string;
    subscription_type: string;
    available_stages: string[];
    auto_renew: boolean;
    cancel_requested: boolean;
    expiry_date: string;
    work_start_time: string;
    work_end_time: string;
    updated_at?: string;
}

export const settingsService = {
    /**
     * Get school settings for the current user.
     * If no settings exist, it creates default settings.
     */
    async getSettings() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // إعدادات مدرسة المستخدم (المدير أو الموظف) — RLS يقصر القراءة على مدرسته
        const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user.id).maybeSingle();
        const { data, error } = await supabase
            .from('school_settings')
            .select('*')
            .eq(profile?.school_id ? 'school_id' : 'user_id', profile?.school_id ?? user.id)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') { // PGRST116 is 'no rows returned'
            // If table doesn't exist, we fallback to defaults for now to not break the UI
            if (error.code === '42P01') {
                console.warn('Table school_settings does not exist. Using defaults.');
                return this.getDefaultSettings();
            }
            throw error;
        }

        if (data) return data as SchoolSettings;

        // If no data, try to create default settings
        try {
            const defaultSettings: SchoolSettings = this.getDefaultSettings(user.id);
            const { data: newData, error: insertError } = await supabase
                .from('school_settings')
                .insert([defaultSettings])
                .select()
                .single();

            if (insertError) {
                console.warn('Could not insert default settings, falling back to local defaults.', insertError);
                return defaultSettings;
            }
            return newData as SchoolSettings;
        } catch (e) {
            console.warn('Error in getSettings creation flow, falling back to local defaults.', e);
            return this.getDefaultSettings();
        }
    },

    /**
     * Update school settings
     */
    async updateSettings(settings: Partial<SchoolSettings>) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user.id).single();
        const { data, error } = await supabase
            .from('school_settings')
            .update({ ...settings, updated_at: new Date().toISOString() })
            .eq('school_id', profile?.school_id)
            .select()
            .single();

        if (error) throw error;
        return data as SchoolSettings;
    },

    getDefaultSettings(userId?: string): SchoolSettings {
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

        return {
            user_id: userId,
            school_name: 'منصة التعليم',
            subscription_type: 'بريميوم',
            available_stages: ['الابتدائية', 'المتوسطة', 'الثانوية'],
            auto_renew: true,
            cancel_requested: false,
            expiry_date: oneYearFromNow.toISOString(),
            work_start_time: '08:00',
            work_end_time: '14:00'
        };
    }
};
