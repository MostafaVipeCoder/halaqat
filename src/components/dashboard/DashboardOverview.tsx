import { useState, useEffect, useMemo } from 'react';
import KPICard from './KPICard';
import QuickActions from './QuickActions';
import RecentActivity from './RecentActivity';
import AttendanceChart from './AttendanceChart';
import PaymentsChart from './PaymentsChart';
import { Users, TrendingUp, AlertCircle, School } from 'lucide-react';
import { useStudents } from '../../hooks/useStudents';
import { useClasses } from '../../hooks/useClasses';
import { useSettings } from '../../hooks/useSettings';
import { useAttendance } from '../../hooks/useAttendance';
import { usePayments } from '../../hooks/usePayments';

export default function DashboardOverview() {
    const { students, isLoading: studentsLoading } = useStudents();
    const { classes, isLoading: classesLoading } = useClasses();
    const { settings } = useSettings();
    const { attendance, isLoading: attendanceLoading } = useAttendance();
    const { payments, stats: paymentStats, isLoading: paymentsLoading } = usePayments();

    // حساب الإحصائيات
    const totalStudents = students.length;
    const activeClasses = classes.length;

    // حساب نسبة الحضور الحقيقية
    const attendanceRate = useMemo(() => {
        const total = attendance.length;
        if (total === 0) return 0;
        const present = attendance.filter(a => a.present).length;
        return Math.round((present / total) * 100);
    }, [attendance]);

    // حساب المدفوعات المتأخرة الحقيقية
    const latePayments = useMemo(() => {
        return payments.filter(p => p.status === 'unpaid').length;
    }, [payments]);

    const isLoading = studentsLoading || classesLoading || attendanceLoading || paymentsLoading;

    if (isLoading) {
        return (
            <div className="mz space-y-6 animate-pulse" dir="rtl">
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="mz space-y-6" dir="rtl">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">
                    مرحباً بك، {settings.school_name || 'المدرسة'} 👋
                </h1>
                <p className="text-gray-600 mt-1">إليك نظرة سريعة على أداء مدرستك اليوم</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                <KPICard
                    label="إجمالي الطلاب"
                    value={totalStudents}
                    icon={Users}
                    color="orange"
                />
                <KPICard
                    label="نسبة الحضور"
                    value={attendanceRate}
                    icon={TrendingUp}
                    color="green"
                    suffix="%"
                />
                <KPICard
                    label="المدفوعات المتأخرة"
                    value={latePayments}
                    icon={AlertCircle}
                    color="red"
                />
                <KPICard
                    label="الحلقات النشطة"
                    value={activeClasses}
                    icon={School}
                    color="blue"
                />
            </div>

            {/* Quick Actions */}
            <QuickActions />

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AttendanceChart />
                <PaymentsChart />
            </div>

            {/* Recent Activity */}
            <RecentActivity />
        </div>
    );
}
