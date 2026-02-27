import { toast } from 'sonner';
import { login } from '../../api/client';

/* ─── Типы ─── */

export interface AuthSlice {
    isAuthenticated: boolean;
    userEmail: string;

    loginFlow: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
}

/* ─── Фабрика слайса ─── */

export const createAuthSlice = (
    set: (fn: (s: AuthSlice) => Partial<AuthSlice>) => void,
): AuthSlice => ({
    isAuthenticated: false,
    userEmail: '',

    loginFlow: async (email, password) => {
        const toastId = toast.loading('Авторизация...');
        try {
            const res = await login(email, password);
            if (res.ok) {
                set(() => ({ isAuthenticated: true, userEmail: email }));
                toast.success('Успешный вход!', { id: toastId });
                return true;
            }
            toast.error('Неверный логин или пароль', { id: toastId });
            return false;
        } catch {
            toast.error('Ошибка сети при авторизации', { id: toastId });
            return false;
        }
    },

    logout: () => {
        set(() => ({ isAuthenticated: false, userEmail: '' }));
        toast.success('Вы вышли из аккаунта');
    },
});
