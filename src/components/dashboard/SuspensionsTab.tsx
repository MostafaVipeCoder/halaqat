import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { History, ShieldAlert, ShieldX, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Badge } from '../ui/badge';
import { Suspension } from '../../services/suspensionService';

interface SuspensionsTabProps {
    suspensions: Suspension[];
    isLoading: boolean;
}

export default function SuspensionsTab({ suspensions, isLoading }: SuspensionsTabProps) {
    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <div className="h-8 w-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (suspensions.length === 0) {
        return (
            <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <History className="h-12 w-12 text-gray-300 mb-4" />
                    <CardTitle className="text-xl font-semibold text-gray-700">لا يوجد سجل سلوك</CardTitle>
                    <p className="text-gray-500 mt-2">لا توجد مخالفات أو قرارات تأديبية مسجلة لهذا الطالب حتى الآن.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in-50 duration-300 slide-in-from-bottom-2">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 font-bold text-gray-700">التاريخ</th>
                                <th className="px-6 py-4 font-bold text-gray-700">نوع الإجراء</th>
                                <th className="px-6 py-4 font-bold text-gray-700">المدة</th>
                                <th className="px-6 py-4 font-bold text-gray-700">السبب</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {suspensions.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 text-gray-600">
                                        {format(new Date(item.start_date), 'PPP', { locale: ar })}
                                    </td>
                                    <td className="px-6 py-4">
                                        {item.type === 'expulsion' ? (
                                            <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">
                                                <ShieldX className="h-3 w-3 ml-1" />
                                                فصل نهائي
                                            </Badge>
                                        ) : item.type === 'suspension' ? (
                                            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200">
                                                <ShieldAlert className="h-3 w-3 ml-1" />
                                                إيقاف مؤقت
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200">
                                                <Info className="h-3 w-3 ml-1" />
                                                تحذير
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {item.type === 'expulsion' ? '-' : `${item.duration_days} يوم`}
                                    </td>
                                    <td className="px-6 py-4 text-gray-700 font-medium max-w-xs truncate">
                                        {item.reason}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
