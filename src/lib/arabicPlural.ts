// صياغة الأعداد مع المعدود حسب قواعد الجمع العربية (CLDR: zero/one/two/few/many/other)

export interface NounForms {
    zero: string;
    one: string;
    two: string;
    /** 3–10: يُكتب العدد قبل الجمع */
    few: string;
    /** 11–99: يُكتب العدد قبل المفرد */
    many: string;
}

const rules = new Intl.PluralRules('ar');
const format = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

/** مثال: countNoun(2, PAGES) → "صفحتان"، countNoun(5, PAGES) → "5 صفحات" */
export const countNoun = (n: number, forms: NounForms) => {
    const category = rules.select(n);
    switch (category) {
        case 'zero': return forms.zero;
        case 'one': return forms.one;
        case 'two': return forms.two;
        case 'few': return `${format.format(n)} ${forms.few}`;
        default: return `${format.format(n)} ${forms.many}`;
    }
};

export const PAGES: NounForms = { zero: 'لا صفحات', one: 'صفحة واحدة', two: 'صفحتان', few: 'صفحات', many: 'صفحة' };
export const SESSIONS: NounForms = { zero: 'لا جلسات', one: 'جلسة واحدة', two: 'جلستان', few: 'جلسات', many: 'جلسة' };
export const SURAHS_COMPLETE: NounForms = { zero: 'لا سور مكتملة', one: 'سورة واحدة مكتملة', two: 'سورتان مكتملتان', few: 'سور مكتملة', many: 'سورة مكتملة' };
export const JUZ: NounForms = { zero: 'لا أجزاء', one: 'جزء واحد', two: 'جزءان', few: 'أجزاء', many: 'جزءًا' };
export const STUDENTS: NounForms = { zero: 'لا طلاب', one: 'طالب واحد', two: 'طالبان', few: 'طلاب', many: 'طالبًا' };
