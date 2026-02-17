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
        try {
            const { data } = await apiClient.post<AuthResponse>("/signup", credentials);
            if (data.token && data.user) {
                tokenStorage.save(data.token);
                return data.user;
            }
            throw new Error("Invalid response from server");
        } catch (error: any) {
            console.error("Registration error:", error);
            throw error;
        }
    },

    async login(credentials: LoginCredentials): Promise<User> {
        try {
            const { data } = await apiClient.post<AuthResponse>("/login", credentials);
            if (data.token && data.user) {
                tokenStorage.save(data.token);
                return data.user;
            }
            throw new Error("Invalid response from server");
        } catch (error: any) {
            console.error("Login error:", error);
            throw error;
        }
    },

    logout(): void {
        tokenStorage.clear();
    },

    isAuthenticated(): boolean {
        return !!tokenStorage.get();
    }
}

