import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { BookOpen, UserPlus, QrCode, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function QuickActions() {
    const navigate = useNavigate();

    // التسميع هو المهمة اليومية الأساسية في مدرسة التحفيظ، فيظهر كإجراء رئيسي
    const actions = [
        { label: 'تسجيل تسميع', icon: BookOpen, primary: true, onClick: () => navigate('/dashboard/recitations') },
        { label: 'إضافة طالب', icon: UserPlus, onClick: () => navigate('/dashboard/students') },
        { label: 'تسجيل الحضور', icon: QrCode, onClick: () => navigate('/dashboard/qr-scanner') },
        { label: 'إضافة دفعة', icon: DollarSign, onClick: () => navigate('/dashboard/payments') },
    ];

    return (
        <Card className="mz bg-white border-gray-200">
            <CardHeader>
                <CardTitle className="text-lg">إجراءات سريعة</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {actions.map((action) => {
                        const Icon = action.icon;
                        return (
                            <Button
                                key={action.label}
                                onClick={action.onClick}
                                variant={action.primary ? 'default' : 'outline'}
                                className={`flex flex-col items-center gap-2 h-auto py-4 ${action.primary
                                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-orange-50'}`}
                            >
                                <Icon className={`h-6 w-6 ${action.primary ? '' : 'text-orange-500'}`} />
                                <span className="text-sm">{action.label}</span>
                            </Button>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
