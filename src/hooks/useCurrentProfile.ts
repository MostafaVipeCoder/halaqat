import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Permission, StaffType } from '../lib/permissions';

export interface CurrentProfile {
    id: string;
    school_id: string | null;
    role: 'admin' | 'manager' | 'staff' | 'accountant';
    staff_type: StaffType | null;
    permissions: Permission[];
    is_active: boolean;
    full_name: string | null;
    email: string | null;
}

/**
 * ملف المستخدم الحالي وصلاحياته. الإخفاء في الواجهة للراحة فقط؛
 * الحماية الفعلية في سياسات RLS بقاعدة البيانات.
 */
export const useCurrentProfile = () => {
    const query = useQuery({
        queryKey: ['current-profile'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('id, school_id, role, staff_type, permissions, is_active, full_name, email')
                .eq('id', user.id)
                .single();
            if (error) throw error;
            return data as CurrentProfile;
        },
        staleTime: 1000 * 60 * 5,
    });

    const profile = query.data ?? null;
    const isManager = profile?.role === 'manager' || profile?.role === 'admin';

    const can = (permission: Permission) =>
        !!profile && (isManager || (profile.is_active && profile.permissions?.includes(permission)));

    const canAny = (...permissions: Permission[]) => permissions.some(can);

    return {
        profile,
        isLoading: query.isLoading,
        /** تعذّر تحميل الحساب (غالبًا مشكلة اتصال) — لا نعرضها كـ"لا توجد صلاحية" */
        isError: query.isError,
        retry: query.refetch,
        isManager,
        /** معلم يرى حلقاته فقط */
        isTeacher: profile?.role === 'staff' && profile.staff_type === 'teacher',
        isDeactivated: profile?.role === 'staff' && profile.is_active === false,
        can,
        canAny,
    };
};
