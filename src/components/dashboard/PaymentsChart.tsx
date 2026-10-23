import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { usePayments } from '../../hooks/usePayments';
import { useMemo } from 'react';

export default function PaymentsChart() {
    const { payments } = usePayments();

    const data = useMemo(() => {
        const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        const currentYear = new Date().getFullYear();

        const dataMap: Record<string, { مدفوع: number; متأخر: number }> = {};

        payments.forEach(p => {
            if (p.year === currentYear) {
                const month = p.month;
                if (!dataMap[month]) dataMap[month] = { مدفوع: 0, متأخر: 0 };

                if (p.status === 'paid') {
                    dataMap[month].مدفوع += Number(p.amount);
                } else if (p.status === 'unpaid') {
                    dataMap[month].متأخر += Number(p.amount);
                } else if (p.status === 'partial') {
                    // Logic for partial could be split, but for simplicity let's count as paid for now or handle appropriately
                    dataMap[month].مدفوع += Number(p.amount);
                }
            }
        });

        return months.map(m => ({
            month: m,
            مدفوع: dataMap[m]?.مدفوع || 0,
            متأخر: dataMap[m]?.متأخر || 0
        })).filter(d => d.مدفوع > 0 || d.متأخر > 0);
    }, [payments]);

    return (
        <Card className="bg-white border-gray-200">
            <CardHeader>
                <CardTitle className="text-lg text-gray-900">المدفوعات الشهرية</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                            dataKey="month"
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
                            formatter={(value: number) => `${value.toLocaleString()} جنيه`}
                        />
                        <Legend
                            wrapperStyle={{ fontSize: '12px' }}
                            formatter={(value: string) => <span style={{ color: '#4B5563' }}>{value}</span>}
                        />
                        <Bar
                            dataKey="مدفوع"
                            fill="#10b981"
                            radius={[8, 8, 0, 0]}
                        />
                        <Bar
                            dataKey="متأخر"
                            fill="#ef4444"
                            radius={[8, 8, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
