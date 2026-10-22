import { useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { BookOpen, BookOpenCheck, ChevronDown, ChevronUp, Flag, Plus, Target, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import RecitationSessionDialog, { suggestStart } from './memorization/RecitationSessionDialog';
import MemorizationPlanDialog from './memorization/MemorizationPlanDialog';
import { countsAsMemorized, gradeMeta, typeMeta } from './memorization/labels';
import { useMemorizationPlan, useRecitationSessions } from '../../hooks/useMemorization';
import { SURAHS, TOTAL_PAGES, computeCoverage, formatRange, surahName } from '../../lib/quran';
import type { Student } from '../../types';

interface MemorizationTabProps {
    student: Pick<Student, 'id' | 'name' | 'class_id'>;
}

const UNIT_LABELS = { lines: 'سطر', pages: 'صفحة', quarters: 'ربع حزب' } as const;
const PAGES_PER_JUZ = TOTAL_PAGES / 30;

const coverageColor = (percent: number) =>
    percent === 100 ? 'bg-emerald-500 text-white border-emerald-500'
        : percent >= 50 ? 'bg-emerald-200 text-emerald-900 border-emerald-300'
            : percent > 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-gray-50 text-gray-400 border-gray-200';

export default function MemorizationTab({ student }: MemorizationTabProps) {
    const { sessions, isLoading, addSession, isAdding, deleteSession } = useRecitationSessions({ studentId: student.id });
    const { plan, isLoading: isPlanLoading, savePlan, isSaving } = useMemorizationPlan(student.id);

    const [isSessionDialogOpen, setIsSessionDialogOpen] = useState(false);
    const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
    const [showSurahs, setShowSurahs] = useState(false);

    const coverage = useMemo(() => computeCoverage(
        plan?.baseline_surahs ?? [],
        sessions.filter(countsAsMemorized).map(s => ({
            from: { surah: s.from_surah, ayah: s.from_ayah },
            to: { surah: s.to_surah, ayah: s.to_ayah },
        }))
    ), [plan, sessions]);

    const last30 = useMemo(() => {
        const since = format(subDays(new Date(), 30), 'yyyy-MM-dd');
        const recent = sessions.filter(s => s.session_date >= since);
        return {
            newPages: Math.round(recent.filter(countsAsMemorized).reduce((sum, s) => sum + Number(s.pages), 0) * 100) / 100,
            reviewPages: Math.round(recent.filter(s => s.type !== 'new').reduce((sum, s) => sum + Number(s.pages), 0) * 100) / 100,
            count: recent.length,
        };
    }, [sessions]);

    const nextStart = suggestStart(sessions, plan?.direction ?? 'backward', plan?.baseline_surahs ?? []);
    const targetPages = plan?.target_juz_count ? plan.target_juz_count * PAGES_PER_JUZ : null;
    const targetPercent = targetPages ? Math.min(100, Math.round((coverage.memorizedPages / targetPages) * 100)) : null;

    const handleDelete = async (id: string, label: string) => {
        if (!window.confirm(`حذف جلسة التسميع (${label})؟`)) return;
        await deleteSession(id);
    };

    if (isLoading || isPlanLoading) {
        return (
            <div className="mz flex justify-center py-20">
                <div className="h-8 w-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="mz space-y-6">
            <div className="flex flex-wrap gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsPlanDialogOpen(true)}>
                    <Target className="h-4 w-4 ml-2" />
                    {plan ? 'تعديل خطة الحفظ' : 'إعداد خطة الحفظ'}
                </Button>
                <Button onClick={() => setIsSessionDialogOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-black">
                    <Plus className="h-4 w-4 ml-2" />
                    تسجيل تسميع
                </Button>
            </div>

            {/* ملخص الحفظ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm text-gray-500">الصفحات المحفوظة</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">≈ {coverage.memorizedPages}</p>
                        <p className="text-xs text-gray-400 mt-1">من {TOTAL_PAGES} صفحة ({coverage.percent}%)</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm text-gray-500">أجزاء مكتملة</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{coverage.completedJuz}</p>
                        <p className="text-xs text-gray-400 mt-1">{coverage.completedSurahs} سورة كاملة</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm text-gray-500">حفظ جديد (30 يوم)</p>
                        <p className="text-3xl font-bold text-emerald-600 mt-1">{last30.newPages}</p>
                        <p className="text-xs text-gray-400 mt-1">صفحة في {last30.count} جلسة</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm text-gray-500">مراجعة (30 يوم)</p>
                        <p className="text-3xl font-bold text-sky-600 mt-1">{last30.reviewPages}</p>
                        <p className="text-xs text-gray-400 mt-1">صفحة</p>
                    </CardContent>
                </Card>
            </div>

            {/* الخطة والورد القادم */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Flag className="h-4 w-4 text-orange-500" />
                            الورد القادم
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <p className="text-lg font-semibold text-gray-900">
                            يبدأ من سورة {surahName(nextStart.surah)} آية {nextStart.ayah}
                        </p>
                        {plan ? (
                            <p className="text-sm text-gray-600">
                                الحفظ اليومي: {Number(plan.daily_amount)} {UNIT_LABELS[plan.amount_unit]} — المراجعة اليومية: {Number(plan.daily_review_pages)} صفحة
                            </p>
                        ) : (
                            <p className="text-sm text-gray-500">لم يتم إعداد خطة حفظ بعد، الاقتراح مبني على الحفظ من الناس صعودًا.</p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Target className="h-4 w-4 text-orange-500" />
                            الهدف
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {targetPercent !== null ? (
                            <>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">
                                        {plan!.target_juz_count} جزء{plan!.target_date ? ` بحلول ${plan!.target_date}` : ''}
                                    </span>
                                    <span className="font-semibold">{targetPercent}%</span>
                                </div>
                                <Progress value={targetPercent} />
                            </>
                        ) : (
                            <p className="text-sm text-gray-500">لا يوجد هدف محدد. أضف عدد الأجزاء المستهدفة من خطة الحفظ.</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* خريطة الحفظ */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">خريطة الحفظ</CardTitle>
                    <CardDescription>نسبة الحفظ في كل جزء (تشمل المحفوظ قبل الالتحاق والحفظ الجديد المقبول)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2">
                        {coverage.juz.map(j => (
                            <div
                                key={j.juz}
                                title={`الجزء ${j.juz}: ${j.percent}%`}
                                className={`rounded-lg border p-2 text-center ${coverageColor(j.percent)}`}
                            >
                                <div className="text-sm font-bold">{j.juz}</div>
                                <div className="text-[10px]">{j.percent}%</div>
                            </div>
                        ))}
                    </div>

                    <Button variant="ghost" size="sm" onClick={() => setShowSurahs(v => !v)} aria-expanded={showSurahs}>
                        {showSurahs ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                        {showSurahs ? 'إخفاء السور' : 'عرض السور'}
                    </Button>

                    {showSurahs && (
                        <div className="flex flex-wrap gap-1.5">
                            {coverage.surahs.map(s => (
                                <span
                                    key={s.number}
                                    title={`${SURAHS[s.number - 1].name}: ${s.percent}%`}
                                    className={`px-2 py-1 rounded-md text-xs border ${coverageColor(s.percent)}`}
                                >
                                    {SURAHS[s.number - 1].name}
                                </span>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* سجل التسميع */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">سجل التسميع</CardTitle>
                </CardHeader>
                <CardContent>
                    {sessions.length === 0 ? (
                        <div className="flex flex-col items-center py-10 text-center">
                            <BookOpen className="h-12 w-12 text-gray-300 mb-3" />
                            <p className="text-gray-500">لا توجد جلسات تسميع مسجلة لهذا الطالب حتى الآن.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse text-sm">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-4 py-3 font-bold text-gray-700">التاريخ</th>
                                        <th className="px-4 py-3 font-bold text-gray-700">النوع</th>
                                        <th className="px-4 py-3 font-bold text-gray-700">المقطع</th>
                                        <th className="px-4 py-3 font-bold text-gray-700">الصفحات</th>
                                        <th className="px-4 py-3 font-bold text-gray-700">الأخطاء</th>
                                        <th className="px-4 py-3 font-bold text-gray-700">التقدير</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {sessions.map(s => {
                                        const label = formatRange({ surah: s.from_surah, ayah: s.from_ayah }, { surah: s.to_surah, ayah: s.to_ayah });
                                        return (
                                            <tr key={s.id} className="hover:bg-gray-50/50">
                                                <td className="px-4 py-3 whitespace-nowrap text-gray-600">{s.session_date}</td>
                                                <td className="px-4 py-3"><Badge variant="outline" className={typeMeta(s.type).className}>{typeMeta(s.type).label}</Badge></td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className="flex items-center gap-1.5">
                                                        {countsAsMemorized(s) && <BookOpenCheck className="h-3.5 w-3.5 text-emerald-500" />}
                                                        {label}
                                                    </span>
                                                    {s.notes && <span className="block text-xs text-gray-400 max-w-xs truncate">{s.notes}</span>}
                                                </td>
                                                <td className="px-4 py-3">{Number(s.pages)}</td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    حفظ {s.memorization_errors} · تشكيل {s.tashkeel_errors} · تجويد {s.tajweed_errors}
                                                    {s.hints > 0 && ` · تنبيه ${s.hints}`}
                                                </td>
                                                <td className="px-4 py-3"><Badge variant="outline" className={gradeMeta(s.grade).className}>{gradeMeta(s.grade).label}</Badge></td>
                                                <td className="px-4 py-3">
                                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id, label)} aria-label="حذف">
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <RecitationSessionDialog
                open={isSessionDialogOpen}
                onOpenChange={setIsSessionDialogOpen}
                students={[{ id: student.id, name: student.name, class_id: student.class_id }]}
                fixedStudentId={student.id}
                onSubmit={addSession}
                isSubmitting={isAdding}
            />

            <MemorizationPlanDialog
                open={isPlanDialogOpen}
                onOpenChange={setIsPlanDialogOpen}
                studentId={student.id}
                studentName={student.name}
                plan={plan}
                onSave={savePlan}
                isSaving={isSaving}
            />
        </div>
    );
}
