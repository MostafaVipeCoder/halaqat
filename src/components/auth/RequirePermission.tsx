import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ShieldOff, WifiOff } from 'lucide-react';
import { Button } from '../ui/button';
import { useCurrentProfile } from '../../hooks/useCurrentProfile';
import type { Permission } from '../../lib/permissions';

interface RequirePermissionProps {
    /** يكفي امتلاك أي صلاحية منها */
    anyOf: Permission[];
    children: ReactNode;
}

/** يمنع فتح الصفحة لمن لا يملك الصلاحية (الحماية الفعلية في RLS) */
export default function RequirePermission({ anyOf, children }: RequirePermissionProps) {
    const { isLoading, isError, retry, canAny } = useCurrentProfile();

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-20 gap-3" dir="rtl">
                <WifiOff className="h-12 w-12 text-gray-300" />
                <h2 className="text-xl font-bold">تعذّر تحميل بيانات حسابك</h2>
                <p className="text-gray-600">تحقق من اتصالك بالإنترنت ثم أعد المحاولة.</p>
                <Button variant="outline" onClick={() => retry()}>إعادة المحاولة</Button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <div className="h-8 w-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!canAny(...anyOf)) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-20 gap-3" dir="rtl">
                <ShieldOff className="h-12 w-12 text-gray-300" />
                <h2 className="text-xl font-bold">ليست لديك صلاحية لهذه الصفحة</h2>
                <p className="text-gray-600">اطلب من مدير المدرسة إضافة الصلاحية لحسابك إذا كنت تحتاجها.</p>
                <Button asChild variant="outline"><Link to="/dashboard">العودة للوحة التحكم</Link></Button>
            </div>
        );
    }

    return <>{children}</>;
}
