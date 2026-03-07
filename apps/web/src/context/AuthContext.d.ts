import React from 'react';
type UserRole = 'incarcerated' | 'family' | 'facility_admin' | 'agency_admin';
interface User {
    id: string;
    role: UserRole;
    email?: string;
    firstName: string;
    lastName: string;
    agencyId?: string;
    facilityId?: string;
    housingUnitId?: string;
}
interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    pinLogin: (pin: string, facilityId: string) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => void;
}
interface RegisterData {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
}
export declare function AuthProvider({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
export declare function useAuth(): AuthContextType;
export {};
//# sourceMappingURL=AuthContext.d.ts.map