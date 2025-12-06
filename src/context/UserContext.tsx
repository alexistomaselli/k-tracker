import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { getSupabase, SUPABASE_CONFIGURED } from '../lib/supabase';
import { Company, Participant } from '../data/mockData';

interface UserContextType {
    user: User | null;
    company: Company | null;
    participant: Participant | null;
    isAdmin: boolean;
    isPlatformAdmin: boolean;
    loading: boolean;
    approvalStatus: 'pending' | 'approved' | 'rejected' | null;
    reloadUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [company, setCompany] = useState<Company | null>(null);
    const [participant, setParticipant] = useState<Participant | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

    const fetchUserData = useCallback(async () => {
        if (!SUPABASE_CONFIGURED) {
            setLoading(false);
            return;
        }

        const supabase = getSupabase();
        if (!supabase) return;

        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            setUser(currentUser);

            if (currentUser) {
                let fetchedCompanyId: string | null = null;

                // Fetch all user roles/associations in parallel
                const [adminUserRes, userCompanyRes, participantRes] = await Promise.all([
                    supabase.from('admin_users').select('role').eq('user_id', currentUser.id).maybeSingle(),
                    supabase.from('user_company').select('id, company_id').eq('user_id', currentUser.id).maybeSingle(),
                    supabase.from('participants').select('*').eq('user_id', currentUser.id).maybeSingle()
                ]);

                const adminUser = adminUserRes.data;
                const userCompany = userCompanyRes.data;
                const participantData = participantRes.data;

                if (adminUser) {
                    setIsPlatformAdmin(true);
                }

                if (userCompany) {
                    setIsAdmin(true);
                    fetchedCompanyId = userCompany.company_id;
                }

                setParticipant(participantData);

                // If not admin but is participant, use participant's company_id
                if (!fetchedCompanyId && participantData) {
                    fetchedCompanyId = participantData.company_id;
                }

                // Fetch Company Details if we have an ID
                if (fetchedCompanyId) {
                    const { data: companyData } = await supabase.from('company').select('*').eq('id', fetchedCompanyId).single();
                    setCompany(companyData as Company);
                    if (companyData) {
                        setApprovalStatus(companyData.approval_status as any);
                    }
                }
            } else {
                // Reset state if no user
                setCompany(null);
                setParticipant(null);
                setIsAdmin(false);
                setIsPlatformAdmin(false);
                setApprovalStatus(null);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUserData();

        // Optional: Listen for auth changes to refetch
        const supabase = getSupabase();
        const { data: { subscription } } = supabase!.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                fetchUserData();
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setCompany(null);
                setParticipant(null);
                setIsAdmin(false);
                setIsPlatformAdmin(false);
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchUserData]);

    return (
        <UserContext.Provider value={{
            user,
            company,
            participant,
            isAdmin,
            isPlatformAdmin,
            loading,
            approvalStatus,
            reloadUser: fetchUserData
        }}>
            {children}
        </UserContext.Provider>
    );
}

export function useCurrentUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useCurrentUser must be used within a UserProvider');
    }
    return context;
}
