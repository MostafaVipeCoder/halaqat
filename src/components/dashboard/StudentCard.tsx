import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Eye, Edit, Trash2, QrCode, Phone, Mail, User, ShieldAlert } from 'lucide-react';

interface StudentCardProps {
    student: any;
    onView: (student: any) => void;
    onEdit: (student: any) => void;
    onDelete: (id: string) => void;
    onShowQR: (student: any) => void;
    onStatusUpdate?: (id: string, newStatus: string) => void;
}

export default function StudentCard({ student, onView, onEdit, onDelete, onShowQR, onStatusUpdate }: StudentCardProps) {
    const getPaymentStatusColor = (status: string) => {
        return status === 'regular' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
    };

    const getPaymentStatusText = (status: string) => {
        return status === 'regular' ? 'منتظم' : 'معفى';
    };

    return (
        <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white border-gray-200 overflow-hidden">
            <CardContent className="p-4 sm:p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-orange-100 p-3 rounded-full shrink-0">
                            <User className="h-6 w-6 text-orange-600" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-lg text-gray-900 break-words" title={student.name}>{student.name}</h3>
                            <p className="text-sm text-gray-500">
                                {student.classes?.name || 'لم يتم تعيين حلقة'}
                            </p>
                        </div>
                    </div>
                    <Badge className={`${getPaymentStatusColor(student.payment_status)} shrink-0`}>
                        {getPaymentStatusText(student.payment_status)}
                    </Badge>
                </div>

                {/* Info */}
                <div className="space-y-2 mb-4 min-w-0">
                    <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
                        <Phone className="h-4 w-4 shrink-0" />
                        <span className="truncate">{student.phone}</span>
                    </div>
                    {student.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
                            <Mail className="h-4 w-4 shrink-0" />
                            <span className="truncate">{student.email}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
                        <User className="h-4 w-4 shrink-0" />
                        <span className="truncate">{student.guardian_name}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-100">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onView(student)}
                        className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 h-9"
                    >
                        <Eye className="h-4 w-4 ml-1" />
                        عرض
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEdit(student)}
                        className="w-full text-orange-600 border-orange-200 hover:bg-orange-50 h-9"
                    >
                        <Edit className="h-4 w-4 ml-1" />
                        تعديل
                    </Button>
                    <div className="col-span-2 flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onShowQR(student)}
                            className="flex-1 h-9 text-green-600 border-green-200 hover:bg-green-50"
                            title="رمز QR"
                        >
                            <QrCode className="h-4 w-4" />
                        </Button>
                        {onStatusUpdate && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    if (confirm('هل أنت متأكد من فصل هذا الطالب نهائيًا؟')) {
                                        onStatusUpdate(student.id, 'expelled');
                                    }
                                }}
                                className="flex-1 h-9 text-red-700 border-red-200 hover:bg-red-50"
                                title="فصل الطالب نهائيًا" aria-label="فصل الطالب نهائيًا"
                            >
                                <ShieldAlert className="h-4 w-4" />
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onDelete(student.id)}
                            className="flex-1 h-9 text-red-600 border-red-200 hover:bg-red-50"
                            title="حذف نهائي"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
