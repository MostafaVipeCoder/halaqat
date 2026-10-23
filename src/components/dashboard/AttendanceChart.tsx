import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAttendance } from '../../hooks/useAttendance';
import { useMemo } from 'react';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function AttendanceChart() {
    const { attendance } = useAttendance();

    const data = useMemo(() => {
        // Generate last 7 days
        const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), i)).reverse();

        return days.map(day => {
            const dayRecords = attendance.filter(a => isSameDay(new Date(a.date), day));
            const total = dayRecords.length;
            const presentCount = dayRecords.filter(a => a.present).length;
            const attendanceRate = total > 0 ? (presentCount / total) * 100 : 0;
            const missingRate = total > 0 ? ((total - presentCount) / total) * 100 : 0;

            return {
                day: format(day, 'EEEE', { locale: ar }),
                حضور: Math.round(attendanceRate),
                غياب: Math.round(missingRate)
            };
        });
    }, [attendance]);

    return (
        <Card className="bg-white border-gray-200">
            <CardHeader>
                <CardTitle className="text-lg text-gray-900">نسبة الحضور الأسبوعية</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                            dataKey="day"
                            stroke="#6b7280"
                            style={{ fontSize: '12px' }}
                        />
                        <YAxis
                            stroke="#6b7280"
                            style={{ fontSize: '12px' }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                fontSize: '12px'
                            }}
                        />
                        <Legend
                            wrapperStyle={{ fontSize: '12px' }}
                            formatter={(value: string) => <span style={{ color: '#4B5563' }}>{value}</span>}
                        />
                        <Line
                            type="monotone"
                            dataKey="حضور"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={{ fill: '#10b981', r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="غياب"
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={{ fill: '#ef4444', r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
