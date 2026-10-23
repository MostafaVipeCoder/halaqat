import { Card, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { X, Filter } from 'lucide-react';
import type { Class } from '../../types';

interface StudentFiltersProps {
    classes: Class[];
    filters: {
        classId: string;
        paymentStatus: string;
    };
    onFilterChange: (filters: { classId: string; paymentStatus: string }) => void;
    onClearFilters: () => void;
}

export default function StudentFilters({ classes, filters, onFilterChange, onClearFilters }: StudentFiltersProps) {
    const hasActiveFilters = filters.classId !== 'all' || filters.paymentStatus !== 'all';

    return (
        <Card className="bg-white border-gray-200">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Filter className="h-5 w-5 text-gray-600" />
                        <h3 className="font-semibold text-gray-900">تصفية النتائج</h3>
                    </div>
                    {hasActiveFilters && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onClearFilters}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                            <X className="h-4 w-4 ml-1" />
                            مسح الفلاتر
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Filter by Class */}
                    <div className="space-y-2">
                        <Label htmlFor="class-filter">الحلقة</Label>
                        <Select
                            value={filters.classId}
                            onValueChange={(value) => onFilterChange({ ...filters, classId: value })}
                        >
                            <SelectTrigger id="class-filter">
                                <SelectValue placeholder="جميع الحلقات" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">جميع الحلقات</SelectItem>
                                {classes.map((cls) => (
                                    <SelectItem key={cls.id} value={cls.id}>
                                        {cls.name} - {cls.stage}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Filter by Payment Status */}
                    <div className="space-y-2">
                        <Label htmlFor="payment-filter">حالة الدفع</Label>
                        <Select
                            value={filters.paymentStatus}
                            onValueChange={(value) => onFilterChange({ ...filters, paymentStatus: value })}
                        >
                            <SelectTrigger id="payment-filter">
                                <SelectValue placeholder="جميع الحالات" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">جميع الحالات</SelectItem>
                                <SelectItem value="regular">منتظم</SelectItem>
                                <SelectItem value="exempt">معفى</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Active Filters Summary */}
                {hasActiveFilters && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-sm text-gray-600">
                            الفلاتر النشطة:{' '}
                            {filters.classId !== 'all' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs mr-2">
                                    {classes.find(c => c.id === filters.classId)?.name || 'حلقة'}
                                </span>
                            )}
                            {filters.paymentStatus !== 'all' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                    {filters.paymentStatus === 'regular' ? 'منتظم' : 'معفى'}
                                </span>
                            )}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
