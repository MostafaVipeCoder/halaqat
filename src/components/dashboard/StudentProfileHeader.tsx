import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { User, Phone, Mail, GraduationCap, MapPin, ShieldAlert, CheckCircle } from 'lucide-react';
import type { Student } from '../../services/studentService';
import type { Class } from '../../services/classService';

interface StudentProfileHeaderProps {
    student: Student;
    studentClass?: Class;
    onEdit: () => void;
    onSuspend: () => void;
    onReactivate: () => void;
}

export default function StudentProfileHeader({
    student,
    studentClass,
    onEdit,
    onSuspend,
    onReactivate
}: StudentProfileHeaderProps) {

    const getStatusBadge = () => {
        switch (student.status) {
            case 'suspended':
                return <Badge variant="destructive" className="bg-yellow-500 hover:bg-yellow-600">موقوف مؤقتاً</Badge>;
            case 'expelled':
                return <Badge variant="destructive">مفصول نهائياً</Badge>;
            default:
                return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">نشط حالياً</Badge>;
        }
    };

    return (
        <Card className="bg-white border-0 shadow-sm overflow-hidden mb-6">
            {/* Cover Image Placeholder - Could be actual cover later */}
            <div className="h-32 bg-gradient-to-r from-orange-400 to-orange-600 w-full relative">
                <div className="absolute top-4 right-4 flex gap-2">
                    {getStatusBadge()}
                </div>
            </div>

            <div className="px-6 pb-6 pt-0 relative flex flex-col md:flex-row gap-6">
                {/* Avatar */}
                <div className="-mt-12 flex-shrink-0">
                    <div className="h-32 w-32 rounded-full border-4 border-white bg-gray-100 flex items-center justify-center shadow-md overflow-hidden">
                        <User className="h-16 w-16 text-gray-400" />
                    </div>
                </div>

                {/* Info Text */}
                <div className="flex-1 pt-2">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{student.name}</h1>
                            <p className="text-gray-500 flex items-center gap-2 mt-1">
                                <GraduationCap className="h-4 w-4" />
                                {studentClass?.name || 'غير محدد'}
                                {studentClass?.grade_level && <span className="text-gray-300">|</span>}
                                {studentClass?.grade_level}
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={onEdit}>تعديل البيانات</Button>
                            {student.status !== 'active' ? (
                                <Button onClick={onReactivate} className="bg-green-600 hover:bg-green-700">
                                    <CheckCircle className="ml-2 h-4 w-4" />
                                    إعادة تفعيل
                                </Button>
                            ) : (
                                <Button variant="destructive" onClick={onSuspend}>
                                    <ShieldAlert className="ml-2 h-4 w-4" />
                                    إجراء إداري
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="h-4 w-4 text-orange-500" />
                            <span dir="ltr">{student.phone}</span>
                        </div>
                        {student.email && (
                            <div className="flex items-center gap-2 text-gray-600">
                                <Mail className="h-4 w-4 text-orange-500" />
                                <span className="truncate">{student.email}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-600">
                            <User className="h-4 w-4 text-blue-500" />
                            <span>ولي الأمر: {student.guardian_name} ({student.guardian_phone})</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                            <div className={`h-2.5 w-2.5 rounded-full ${student.payment_status === 'regular' ? 'bg-green-500' : 'bg-blue-500'}`} />
                            <span>{student.payment_status === 'regular' ? 'دفع كامل' : 'معفى من الرسوم'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
}
