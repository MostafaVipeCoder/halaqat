import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { supabase } from '../../lib/supabase';

interface GoogleSignInButtonProps {
    label?: string;
}

// signInWithOAuth redirects straight to Supabase, which shows a raw JSON error when the
// provider is off. Asking the public settings endpoint first lets us hide the button instead.
let googleEnabledRequest: Promise<boolean> | null = null;

const fetchGoogleEnabled = () => {
    googleEnabledRequest ??= fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
    })
        .then(res => (res.ok ? res.json() : null))
        .then(settings => Boolean(settings?.external?.google))
        .catch(() => false);
    return googleEnabledRequest;
};

function useGoogleAuthEnabled() {
    const [enabled, setEnabled] = useState(false);
    useEffect(() => {
        let active = true;
        fetchGoogleEnabled().then(value => active && setEnabled(value));
        return () => { active = false; };
    }, []);
    return enabled;
}

/** شعار Google الرسمي (متعدد الألوان) كما تشترطه إرشادات العلامة */
function GoogleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z" />
        </svg>
    );
}

/** زر Google وفاصل "أو" — لا يظهر شيء حتى يتم تفعيل Google في Supabase */
export default function GoogleSignInSection({ label }: GoogleSignInButtonProps) {
    const enabled = useGoogleAuthEnabled();
    if (!enabled) return null;
    return (
        <>
            <GoogleSignInButton label={label} />
            <AuthDivider />
        </>
    );
}

function GoogleSignInButton({ label = 'المتابعة باستخدام Google' }: GoogleSignInButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                // يرجع للصفحة الرئيسية، و App.tsx يوجّه حسب الدور (مدير مدرسة أو أدمن المنصة)
                redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
                queryParams: { prompt: 'select_account' },
            },
        });
        if (error) {
            console.error('Google sign-in error:', error);
            toast.error(/provider is not enabled/i.test(error.message)
                ? 'الدخول بحساب Google غير مفعّل بعد على المنصة'
                : 'تعذّر الدخول بحساب Google، حاول مرة أخرى');
            setLoading(false);
        }
        // عند النجاح يتم تحويل المتصفح إلى Google فلا داعي لإيقاف حالة التحميل
    };

    return (
        <Button
            type="button"
            variant="outline"
            onClick={handleClick}
            disabled={loading}
            className="mz w-full bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
        >
            <GoogleIcon />
            <span className="mr-2">{loading ? 'جاري التحويل إلى Google...' : label}</span>
        </Button>
    );
}

/** فاصل "أو" بين الدخول بـ Google والدخول بالبريد */
function AuthDivider() {
    return (
        <div className="mz flex items-center gap-3 my-4" role="separator" aria-label="أو">
            <span className="flex-1 border-t border-gray-200" />
            <span className="text-xs text-gray-500">أو</span>
            <span className="flex-1 border-t border-gray-200" />
        </div>
    );
}
