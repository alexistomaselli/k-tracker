import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCurrentUser } from '../hooks/useData';
import { getSupabase } from '../lib/supabase';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const { company } = useCurrentUser();
    const [theme, setTheme] = useState<Theme>('light');

    // Load theme from local storage or company preference on mount
    useEffect(() => {
        if (company?.theme) {
            setTheme(company.theme as Theme);
            localStorage.setItem('theme', company.theme);
        } else {
            const storedTheme = localStorage.getItem('theme') as Theme;
            if (storedTheme) {
                setTheme(storedTheme);
            } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                setTheme('dark');
            }
        }
    }, [company]);

    // Apply theme to document
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Persist theme to company settings
    const persistTheme = async (newTheme: Theme) => {
        if (user && company) {
            try {
                const supabase = getSupabase();
                if (supabase) {
                    await supabase
                        .from('company')
                        .update({ theme: newTheme })
                        .eq('id', company.id);
                }
            } catch (error) {
                console.error('Error saving theme preference:', error);
            }
        }
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        persistTheme(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
