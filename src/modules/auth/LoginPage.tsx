import { useState, type FormEvent } from 'react';
import { usePanelStore } from '../../core/store';

export function LoginPage() {
    const loginFlow = usePanelStore((s) => s.loginFlow);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const success = await loginFlow(email, password);

        if (!success) {
            setError('Неверный логин или пароль');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
            <form
                onSubmit={handleSubmit}
                className="bg-background border rounded-xl shadow-sm p-8 w-full max-w-md space-y-6"
                style={{ borderColor: 'var(--polka-border)' }}
            >
                {/* Логотип */}
                <div className="text-center space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        ПОЛКА CRM
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Войдите в свой аккаунт
                    </p>
                </div>

                {/* Ошибка */}
                {error && (
                    <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                {/* Email */}
                <div className="space-y-2">
                    <label htmlFor="login-email" className="text-sm font-medium text-foreground">
                        Email
                    </label>
                    <input
                        id="login-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@example.com"
                        className="w-full h-10 px-3 rounded-md border bg-background text-foreground
                                   placeholder:text-muted-foreground
                                   focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                        style={{ borderColor: 'var(--polka-border)' }}
                    />
                </div>

                {/* Пароль */}
                <div className="space-y-2">
                    <label htmlFor="login-password" className="text-sm font-medium text-foreground">
                        Пароль
                    </label>
                    <input
                        id="login-password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-10 px-3 rounded-md border bg-background text-foreground
                                   placeholder:text-muted-foreground
                                   focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                        style={{ borderColor: 'var(--polka-border)' }}
                    />
                </div>

                {/* Кнопка */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium
                               hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed
                               transition-colors"
                >
                    {loading ? 'Вход...' : 'Войти'}
                </button>
            </form>
        </div>
    );
}
