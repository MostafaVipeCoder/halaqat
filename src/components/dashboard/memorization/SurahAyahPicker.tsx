import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { SURAHS, getSurah, type AyahRef } from '../../../lib/quran';

interface SurahAyahPickerProps {
    label: string;
    idPrefix: string;
    value: AyahRef;
    onChange: (value: AyahRef) => void;
}

export default function SurahAyahPicker({ label, idPrefix, value, onChange }: SurahAyahPickerProps) {
    const maxAyah = getSurah(value.surah)?.ayahs ?? 1;

    return (
        <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-surah`}>{label}</Label>
            <div className="flex gap-2">
                <Select
                    value={String(value.surah)}
                    onValueChange={(v) => {
                        const surah = Number(v);
                        const ayahs = getSurah(surah)?.ayahs ?? 1;
                        onChange({ surah, ayah: Math.min(value.ayah, ayahs) });
                    }}
                >
                    <SelectTrigger id={`${idPrefix}-surah`} className="flex-1">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="mz max-h-72">
                        {SURAHS.map(s => (
                            <SelectItem key={s.number} value={String(s.number)}>
                                {s.number}. {s.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Input
                    id={`${idPrefix}-ayah`}
                    aria-label={`${label} - رقم الآية`}
                    type="number"
                    min={1}
                    max={maxAyah}
                    className="w-20"
                    value={value.ayah}
                    onChange={(e) => {
                        const ayah = Math.max(1, Math.min(maxAyah, parseInt(e.target.value) || 1));
                        onChange({ ...value, ayah });
                    }}
                />
            </div>
            <p className="text-[11px] text-gray-500">الآيات: 1 - {maxAyah}</p>
        </div>
    );
}
