import React from 'react';
interface User {
    id: string;
    role: 'incarcerated';
    firstName: string;
    lastName: string;
    facilityId?: string;
    housingUnitId?: string;
}
interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    pinLogin: (pin: string, facilityId: string) => Promise<void>;
    logout: () => void;
}
export declare function AuthProvider({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
export declare function useAuth(): AuthContextType;
export {};
//# sourceMappingURL=AuthContext.d.ts.map