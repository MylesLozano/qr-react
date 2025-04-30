import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, getUserRole } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            try {
                if (currentUser && currentUser.email.endsWith('@jmc.edu.ph')) {
                    if (isMounted) {
                        setUser(currentUser);
                        const userRole = await getUserRole(currentUser.uid);
                        setRole(userRole);
                        setError(null);
                    }
                } else {
                    if (isMounted) {
                        setUser(null);
                        setRole(null);
                        if (currentUser) {
                            setError('Only @jmc.edu.ph accounts are allowed');
                            toast.error('Only @jmc.edu.ph accounts are allowed');
                        }
                    }
                }
            } catch (error) {
                console.error('Error in auth state change:', error);
                if (isMounted) {
                    setError('Failed to fetch user information');
                    toast.error('Failed to fetch user information');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, []);

    const value = {
        user,
        role,
        loading,
        error
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
} 