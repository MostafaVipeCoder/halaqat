// الصلاحيات داخل المدرسة — يجب أن تطابق المفاتيح المستخدمة في migrations/002_staff_permissions.sql

export type Permission =
    | 'students.view' | 'students.manage'
    | 'classes.manage'
    | 'attendance.record' | 'recitations.record'
    | 'finance.view' | 'finance.manage'
    | 'reports.view'
    | 'exams.grade' | 'exams.manage'
    | 'staff.manage' | 'settings.manage';

export type StaffType = 'accountant' | 'student_affairs' | 'teacher' | 'control' | 'custom';

export const PERMISSION_GROUPS: { title: string; items: { key: Permission; label: string; hint: string }[] }[] = [
    {
        title: 'الطلاب والحلقات',
        items: [
            { key: 'students.view', label: 'عرض الطلاب', hint: 'رؤية بيانات الطلاب وملفاتهم' },
            { key: 'students.manage', label: 'إدارة الطلاب', hint: 'إضافة وتعديل وحذف الطلاب والإجراءات الإدارية' },
            { key: 'classes.manage', label: 'إدارة الحلقات والجدول', hint: 'الحلقات والمراحل وجدول المعلمين' },
        ],
    },
    {
        title: 'التحفيظ والحضور',
        items: [
            { key: 'recitations.record', label: 'تسجيل التسميع', hint: 'جلسات التسميع وخطط الحفظ' },
            { key: 'attendance.record', label: 'تسجيل الحضور', hint: 'الحضور اليدوي ومسح QR' },
        ],
    },
    {
        title: 'المالية',
        items: [
            { key: 'finance.view', label: 'عرض المالية', hint: 'المدفوعات والتقارير المالية' },
            { key: 'finance.manage', label: 'إدارة المالية', hint: 'إصدار الفواتير وتسجيل الدفعات' },
        ],
    },
    {
        title: 'الامتحانات',
        items: [
            { key: 'exams.grade', label: 'رصد الدرجات', hint: 'إدخال درجات الطلاب أثناء فترة الرصد' },
            { key: 'exams.manage', label: 'الكونترول', hint: 'إنشاء الامتحانات ومراجعتها واعتمادها وتعديل الدرجات بعد الاعتماد' },
        ],
    },
    {
        title: 'الإدارة',
        items: [
            { key: 'reports.view', label: 'عرض التقارير', hint: 'تقارير الحضور والأداء والمعلمين' },
            { key: 'staff.manage', label: 'إدارة الموظفين', hint: 'إضافة الموظفين وتحديد صلاحياتهم' },
            { key: 'settings.manage', label: 'إعدادات المدرسة', hint: 'اسم المدرسة ومواعيد العمل والمراحل' },
        ],
    },
];

export const STAFF_TYPES: { value: StaffType; label: string; preset: Permission[] }[] = [
    { value: 'teacher', label: 'محفّظ / معلم', preset: ['students.view', 'attendance.record', 'recitations.record', 'exams.grade'] },
    { value: 'accountant', label: 'محاسب', preset: ['students.view', 'finance.view', 'finance.manage', 'reports.view'] },
    { value: 'student_affairs', label: 'شؤون الطلاب', preset: ['students.view', 'students.manage', 'classes.manage', 'attendance.record', 'reports.view'] },
    { value: 'control', label: 'مسؤول كونترول', preset: ['students.view', 'exams.manage', 'exams.grade', 'reports.view'] },
    { value: 'custom', label: 'وظيفة أخرى', preset: ['students.view'] },
];

export const staffTypeLabel = (t?: string | null) => STAFF_TYPES.find(s => s.value === t)?.label ?? 'موظف';

export const permissionLabel = (p: string) =>
    PERMISSION_GROUPS.flatMap(g => g.items).find(i => i.key === p)?.label ?? p;
