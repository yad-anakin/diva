"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      const next = sp.get("next") || "/";
      router.replace(next);
    } catch (e: any) {
      setError(e?.message || "تعذر تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  // PWA install availability for login page
  useEffect(() => {
    const onBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setCanInstall(false);
      setIsInstalled(true);
    };
    // Detect installed/standalone
    const checkStandalone = () => {
      const standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
      // @ts-ignore iOS Safari
      const iosStandalone = (window as any).navigator?.standalone === true;
      setIsInstalled(standalone || iosStandalone);
    };
    checkStandalone();
    window.addEventListener('resize', checkStandalone);
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt as any);
    window.addEventListener('appinstalled', onInstalled as any);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt as any);
      window.removeEventListener('appinstalled', onInstalled as any);
      window.removeEventListener('resize', checkStandalone);
    };
  }, []);

  return (
    <main className="min-h-screen grid place-items-center bg-white p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-3xl font-extrabold text-diva-deep tracking-tight">Diva Salon</div>
          <div className="text-sm text-gray-600 mt-1">تسجيل الدخول للوصول إلى النظام</div>
        </div>
        <div className="border border-gray-200 rounded-2xl p-6">
          {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 focus:border-pink-400 focus:outline-none rounded-xl px-3 py-2"
                autoComplete="username"
                inputMode="email"
                spellCheck={false}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 focus:border-pink-400 focus:outline-none rounded-xl px-3 py-2"
                autoComplete="current-password"
                spellCheck={false}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? "جاري الدخول..." : "دخول"}
            </button>
          </form>
          {!isInstalled && (
            <div className="mt-4">
              <button
                type="button"
                className="btn btn-outline w-full"
                disabled={!canInstall}
                onClick={async () => {
                  try {
                    if (!deferredPrompt) return;
                    deferredPrompt.prompt();
                    await deferredPrompt.userChoice.catch(() => ({}));
                    setDeferredPrompt(null);
                    setCanInstall(false);
                  } catch {
                    // silently ignore
                  }
                }}
                title="تثبيت التطبيق"
              >
                تثبيت التطبيق
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
