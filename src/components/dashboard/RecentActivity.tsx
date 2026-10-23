import { Link } from 'react-router-dom';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { BookOpen, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useRecitationSessions } from '../../hooks/useMemorization';
import { gradeMeta, typeMeta } from './memorization/labels';
import { formatRange } from '../../lib/quran';

const SINCE = format(subDays(new Date(), 7), 'yyyy-MM-dd');

/** آخر جلسات التسميع في المدرسة (بيانات حقيقية من قاعدة البيانات) */
export default function RecentActivity() {
    const { sessions, isLoading } = useRecitationSessions({ fromDate: SINCE });
    const recent = sessions.slice(0, 6);

    return (
        <Card className="bg-white border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">آخر التسميعات</CardTitle>
                {recent.length > 0 && (
                    <Link to="/dashboard/recitations" className="text-sm text-orange-600 hover:text-orange-700">
                        عرض الكل
                    </Link>
                )}
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <div className="h-6 w-6 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                    </div>
                ) : recent.length === 0 ? (
                    <div className="flex flex-col items-center text-center py-8 gap-3">
                        <BookOpen className="h-10 w-10 text-gray-300" />
                        <p className="text-gray-600">لا توجد جلسات تسميع في آخر 7 أيام.</p>
                        <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white">
                            <Link to="/dashboard/recitations">
                                <Plus className="h-4 w-4 ml-2" />
                                تسجيل أول تسميع
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {recent.map(s => (
                            <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                                <div className="min-w-0">
                                    <Link to={`/dashboard/students/${s.student_id}`} className="font-medium text-gray-900 hover:text-orange-600">
                                        {s.students?.name || '-'}
                                    </Link>
                                    <p className="text-sm text-gray-600 truncate">
                                        {typeMeta(s.type).label}: {formatRange({ surah: s.from_surah, ayah: s.from_ayah }, { surah: s.to_surah, ayah: s.to_ayah })}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    <Badge variant="outline" className={gradeMeta(s.grade).className}>{gradeMeta(s.grade).label}</Badge>
                                    <span className="text-xs text-gray-500">
                                        {formatDistanceToNow(new Date(s.created_at), { addSuffix: true, locale: ar })}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
