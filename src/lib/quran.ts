// بيانات المصحف المرجعية (مصحف المدينة - 604 صفحة) ودوال حساب الحفظ

export interface Surah {
    number: number;
    name: string;
    ayahs: number;
    startPage: number;
}

export interface AyahRef {
    surah: number;
    ayah: number;
}

export type MemorizationDirection = 'forward' | 'backward';

const SURAH_DATA: [string, number, number][] = [
    ['الفاتحة', 7, 1], ['البقرة', 286, 2], ['آل عمران', 200, 50], ['النساء', 176, 77],
    ['المائدة', 120, 106], ['الأنعام', 165, 128], ['الأعراف', 206, 151], ['الأنفال', 75, 177],
    ['التوبة', 129, 187], ['يونس', 109, 208], ['هود', 123, 221], ['يوسف', 111, 235],
    ['الرعد', 43, 249], ['إبراهيم', 52, 255], ['الحجر', 99, 262], ['النحل', 128, 267],
    ['الإسراء', 111, 282], ['الكهف', 110, 293], ['مريم', 98, 305], ['طه', 135, 312],
    ['الأنبياء', 112, 322], ['الحج', 78, 332], ['المؤمنون', 118, 342], ['النور', 64, 350],
    ['الفرقان', 77, 359], ['الشعراء', 227, 367], ['النمل', 93, 377], ['القصص', 88, 385],
    ['العنكبوت', 69, 396], ['الروم', 60, 404], ['لقمان', 34, 411], ['السجدة', 30, 415],
    ['الأحزاب', 73, 418], ['سبأ', 54, 428], ['فاطر', 45, 434], ['يس', 83, 440],
    ['الصافات', 182, 446], ['ص', 88, 453], ['الزمر', 75, 458], ['غافر', 85, 467],
    ['فصلت', 54, 477], ['الشورى', 53, 483], ['الزخرف', 89, 489], ['الدخان', 59, 496],
    ['الجاثية', 37, 499], ['الأحقاف', 35, 502], ['محمد', 38, 507], ['الفتح', 29, 511],
    ['الحجرات', 18, 515], ['ق', 45, 518], ['الذاريات', 60, 520], ['الطور', 49, 523],
    ['النجم', 62, 526], ['القمر', 55, 528], ['الرحمن', 78, 531], ['الواقعة', 96, 534],
    ['الحديد', 29, 537], ['المجادلة', 22, 542], ['الحشر', 24, 545], ['الممتحنة', 13, 549],
    ['الصف', 14, 551], ['الجمعة', 11, 553], ['المنافقون', 11, 554], ['التغابن', 18, 556],
    ['الطلاق', 12, 558], ['التحريم', 12, 560], ['الملك', 30, 562], ['القلم', 52, 564],
    ['الحاقة', 52, 566], ['المعارج', 44, 568], ['نوح', 28, 570], ['الجن', 28, 572],
    ['المزمل', 20, 574], ['المدثر', 56, 575], ['القيامة', 40, 577], ['الإنسان', 31, 578],
    ['المرسلات', 50, 580], ['النبأ', 40, 582], ['النازعات', 46, 583], ['عبس', 42, 585],
    ['التكوير', 29, 586], ['الانفطار', 19, 587], ['المطففين', 36, 587], ['الانشقاق', 25, 589],
    ['البروج', 22, 590], ['الطارق', 17, 591], ['الأعلى', 19, 591], ['الغاشية', 26, 592],
    ['الفجر', 30, 593], ['البلد', 20, 594], ['الشمس', 15, 595], ['الليل', 21, 595],
    ['الضحى', 11, 596], ['الشرح', 8, 596], ['التين', 8, 597], ['العلق', 19, 597],
    ['القدر', 5, 598], ['البينة', 8, 598], ['الزلزلة', 8, 599], ['العاديات', 11, 599],
    ['القارعة', 11, 600], ['التكاثر', 8, 600], ['العصر', 3, 601], ['الهمزة', 9, 601],
    ['الفيل', 5, 601], ['قريش', 4, 602], ['الماعون', 7, 602], ['الكوثر', 3, 602],
    ['الكافرون', 6, 603], ['النصر', 3, 603], ['المسد', 5, 603], ['الإخلاص', 4, 604],
    ['الفلق', 5, 604], ['الناس', 6, 604],
];

export const SURAHS: Surah[] = SURAH_DATA.map(([name, ayahs, startPage], i) => ({
    number: i + 1,
    name,
    ayahs,
    startPage,
}));

// بداية كل جزء (سورة، آية)
const JUZ_STARTS: [number, number][] = [
    [1, 1], [2, 142], [2, 253], [3, 93], [4, 24], [4, 148], [5, 82], [6, 111], [7, 88], [8, 41],
    [9, 93], [11, 6], [12, 53], [15, 1], [17, 1], [18, 75], [21, 1], [23, 1], [25, 21], [27, 56],
    [29, 46], [33, 31], [36, 28], [39, 32], [41, 47], [46, 1], [51, 31], [58, 1], [67, 1], [78, 1],
];

export const TOTAL_PAGES = 604;
export const TOTAL_AYAHS = 6236;

// فهرس تراكمي: رقم أول آية من كل سورة في ترتيب المصحف (يبدأ من 0)
const SURAH_OFFSETS: number[] = (() => {
    const offsets: number[] = [];
    let acc = 0;
    for (const s of SURAHS) {
        offsets.push(acc);
        acc += s.ayahs;
    }
    return offsets;
})();

// عدد الصفحات التقريبي لكل آية في سورتها (لتقدير الصفحات المحفوظة).
// السور التي تبدأ في نفس الصفحة تتقاسمها بنسبة عدد آياتها، فيكون المجموع 604 صفحة بالضبط.
const PAGES_PER_AYAH: number[] = (() => {
    const positions: number[] = [];
    let i = 0;
    while (i < SURAHS.length) {
        let j = i;
        while (j + 1 < SURAHS.length && SURAHS[j + 1].startPage === SURAHS[i].startPage) j++;
        const groupAyahs = SURAHS.slice(i, j + 1).reduce((sum, s) => sum + s.ayahs, 0);
        let acc = 0;
        for (let k = i; k <= j; k++) {
            positions[k] = SURAHS[i].startPage - 1 + (j > i ? acc / groupAyahs : 0);
            acc += SURAHS[k].ayahs;
        }
        i = j + 1;
    }
    positions.push(TOTAL_PAGES);
    return SURAHS.map((s, k) => (positions[k + 1] - positions[k]) / s.ayahs);
})();

export const getSurah = (number: number): Surah | undefined => SURAHS[number - 1];

export const surahName = (number: number) => getSurah(number)?.name ?? `سورة ${number}`;

/** رقم الآية في ترتيب المصحف كاملاً (0 .. 6235) */
export const globalAyahIndex = ({ surah, ayah }: AyahRef) => SURAH_OFFSETS[surah - 1] + ayah - 1;

export const isValidRef = ({ surah, ayah }: AyahRef) => {
    const s = getSurah(surah);
    return !!s && ayah >= 1 && ayah <= s.ayahs;
};

export const juzRanges = JUZ_STARTS.map(([surah, ayah], i) => {
    const start = globalAyahIndex({ surah, ayah });
    const end = i < JUZ_STARTS.length - 1
        ? globalAyahIndex({ surah: JUZ_STARTS[i + 1][0], ayah: JUZ_STARTS[i + 1][1] }) - 1
        : TOTAL_AYAHS - 1;
    return { juz: i + 1, start, end };
});

export const juzOfSurah = (surah: number) =>
    juzRanges.find(r => globalAyahIndex({ surah, ayah: 1 }) <= r.end)?.juz ?? 30;

/** السور التي تقع كاملة داخل جزء معيّن (لتحديد جزء عم أو تبارك دفعة واحدة) */
export const surahsFullyInJuz = (juz: number) => {
    const range = juzRanges[juz - 1];
    return SURAHS.filter(s => {
        const first = globalAyahIndex({ surah: s.number, ayah: 1 });
        const last = globalAyahIndex({ surah: s.number, ayah: s.ayahs });
        return first >= range.start && last <= range.end;
    }).map(s => s.number);
};

/**
 * تحويل مقطع تسميع إلى مجالات آيات متصلة في ترتيب المصحف.
 * المقطع قد يكون تصاعديًا (من البقرة لآل عمران) أو تنازليًا (من الناس للفلق)،
 * وفي التنازلي يكون الحفظ داخل كل سورة من أولها لآخرها.
 */
export const rangeSegments = (from: AyahRef, to: AyahRef): [number, number][] => {
    if (from.surah <= to.surah) {
        const a = globalAyahIndex(from);
        const b = globalAyahIndex(to);
        return [[Math.min(a, b), Math.max(a, b)]];
    }
    const segments: [number, number][] = [];
    const fromSurah = getSurah(from.surah)!;
    segments.push([globalAyahIndex(from), globalAyahIndex({ surah: from.surah, ayah: fromSurah.ayahs })]);
    for (let s = from.surah - 1; s > to.surah; s--) {
        segments.push([globalAyahIndex({ surah: s, ayah: 1 }), globalAyahIndex({ surah: s, ayah: SURAHS[s - 1].ayahs })]);
    }
    segments.push([globalAyahIndex({ surah: to.surah, ayah: 1 }), globalAyahIndex(to)]);
    return segments;
};

const surahIndexOfAyah = (index: number) => {
    let lo = 0;
    let hi = SURAH_OFFSETS.length - 1;
    while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (SURAH_OFFSETS[mid] <= index) lo = mid;
        else hi = mid - 1;
    }
    return lo;
};

/** تقدير عدد الصفحات لمقطع (للتعبئة التلقائية — يمكن للمحفّظ تعديله) */
export const estimatePages = (from: AyahRef, to: AyahRef) => {
    let pages = 0;
    for (const [a, b] of rangeSegments(from, to)) {
        for (let i = a; i <= b; i++) pages += PAGES_PER_AYAH[surahIndexOfAyah(i)];
    }
    return Math.round(pages * 4) / 4;
};

export const formatRange = (from: AyahRef, to: AyahRef) => {
    if (from.surah === to.surah) {
        if (from.ayah === 1 && to.ayah === getSurah(from.surah)?.ayahs) return `سورة ${surahName(from.surah)} كاملة`;
        return `${surahName(from.surah)} ${from.ayah} - ${to.ayah}`;
    }
    return `${surahName(from.surah)} ${from.ayah} ← ${surahName(to.surah)} ${to.ayah}`;
};

/** الموضع التالي بعد آخر حفظ جديد حسب اتجاه الخطة */
export const nextStartAfter = (last: AyahRef, direction: MemorizationDirection): AyahRef | null => {
    const surah = getSurah(last.surah);
    if (!surah) return null;
    if (last.ayah < surah.ayahs) return { surah: last.surah, ayah: last.ayah + 1 };
    const nextSurah = direction === 'forward' ? last.surah + 1 : last.surah - 1;
    return nextSurah >= 1 && nextSurah <= 114 ? { surah: nextSurah, ayah: 1 } : null;
};

export interface CoverageSummary {
    memorizedAyahs: number;
    memorizedPages: number;
    percent: number;
    juz: { juz: number; percent: number }[];
    surahs: { number: number; percent: number }[];
    completedJuz: number;
    completedSurahs: number;
}

/** حساب التغطية الكلية من السور المحفوظة سابقًا + مقاطع الحفظ الجديد */
export const computeCoverage = (baselineSurahs: number[], ranges: { from: AyahRef; to: AyahRef }[]): CoverageSummary => {
    const covered = new Uint8Array(TOTAL_AYAHS);

    for (const n of baselineSurahs) {
        const s = getSurah(n);
        if (!s) continue;
        covered.fill(1, SURAH_OFFSETS[n - 1], SURAH_OFFSETS[n - 1] + s.ayahs);
    }
    for (const { from, to } of ranges) {
        if (!isValidRef(from) || !isValidRef(to)) continue;
        for (const [a, b] of rangeSegments(from, to)) covered.fill(1, a, b + 1);
    }

    let memorizedAyahs = 0;
    let memorizedPages = 0;
    const surahs = SURAHS.map((s, i) => {
        let count = 0;
        for (let k = SURAH_OFFSETS[i]; k < SURAH_OFFSETS[i] + s.ayahs; k++) count += covered[k];
        memorizedAyahs += count;
        memorizedPages += count * PAGES_PER_AYAH[i];
        return { number: s.number, percent: Math.round((count / s.ayahs) * 100) };
    });

    const juz = juzRanges.map(r => {
        let count = 0;
        for (let k = r.start; k <= r.end; k++) count += covered[k];
        return { juz: r.juz, percent: Math.round((count / (r.end - r.start + 1)) * 100) };
    });

    return {
        memorizedAyahs,
        memorizedPages: Math.round(memorizedPages * 10) / 10,
        percent: Math.round((memorizedPages / TOTAL_PAGES) * 1000) / 10,
        juz,
        surahs,
        completedJuz: juz.filter(j => j.percent === 100).length,
        completedSurahs: surahs.filter(s => s.percent === 100).length,
    };
};
