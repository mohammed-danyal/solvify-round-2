import apiClient from "@/lib/axios";

interface User {
    id: string;
    email: string;
    name: string;
}

interface AuthResponse {
    token: string;
    user: User;
}

interface LoginCredentials {
    email: string;
    password: string;
}

interface RegisterCredentials extends LoginCredentials {
    name: string,
}

const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY || "token";

const tokenStorage = {
    save: (token: string) => localStorage.setItem(TOKEN_KEY, token),
    clear: () => localStorage.removeItem(TOKEN_KEY),
    get: () => typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null,
};

export const authService = {
    async register(credentials: RegisterCredentials): Promise<User> {
        const { data } = await apiClient.post<AuthResponse>("/signup", credentials);
        tokenStorage.save(data.token);
        return data.user;
    },

    async login(credentials: LoginCredentials): Promise<User> {
        const { data } = await apiClient.post<AuthResponse>("/login", credentials);
        tokenStorage.save(data.token);
        return data.user;
    },

    logout(): void {
        tokenStorage.clear();
    },

    isAuthenticated(): boolean {
        return !!tokenStorage.get();
    }
}

