interface LogoMarkProps {
    size?: number;
    /** 'onDark' للخلفيات الكحلية، 'onLight' للخلفيات الفاتحة */
    tone?: 'onDark' | 'onLight';
    className?: string;
}

/** شعار حلقات: طلاب جالسون في حلقة حول المصحف */
export function LogoMark({ size = 40, tone = 'onDark', className }: LogoMarkProps) {
    const book = tone === 'onDark' ? '#FFFFFF' : 'var(--brand-navy-900)';
    const dots = Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
        return { cx: 24 + Math.cos(angle) * 18, cy: 24 + Math.sin(angle) * 18 };
    });

    return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" className={className}>
            {dots.map((d, i) => (
                <circle key={i} cx={d.cx} cy={d.cy} r={2.8} fill="var(--brand-turquoise)" />
            ))}
            <path d="M24 17.5c-3.6-2.4-7.6-2.9-11-1.8v14.6c3.4-1.1 7.4-.6 11 1.8z" fill={book} />
            <path d="M24 17.5c3.6-2.4 7.6-2.9 11-1.8v14.6c-3.4-1.1-7.4-.6-11 1.8z" fill={book} opacity={0.82} />
        </svg>
    );
}

interface LogoProps extends LogoMarkProps {
    subtitle?: string;
    wordmarkClassName?: string;
}

export default function Logo({ size = 40, tone = 'onDark', subtitle, className, wordmarkClassName }: LogoProps) {
    const nameColor = tone === 'onDark' ? '#FFFFFF' : 'var(--brand-navy-900)';

    return (
        <span className={`inline-flex items-center min-w-0 ${className ?? ''}`} style={{ gap: 10 }}>
            <LogoMark size={size} tone={tone} className="shrink-0" />
            <span className="flex flex-col min-w-0 text-right">
                <span className={`brand-wordmark ${wordmarkClassName ?? ''}`} style={{ color: nameColor }}>حلقات</span>
                {subtitle && <span className="brand-subtitle truncate">{subtitle}</span>}
            </span>
        </span>
    );
}
