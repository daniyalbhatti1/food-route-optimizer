'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, getUserProfile, upsertProfile } from '@/lib/supabaseClient';
import { AuthUser, Profile } from '@/lib/types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string) => Promise<void>;
  signInDev: (name: string, role?: 'user' | 'owner') => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('Getting initial session...');
        
        // First check for dev session in localStorage (only if available)
        let devSession = null;
        try {
          devSession = localStorage.getItem('dev-session');
          console.log('Dev session from localStorage:', devSession);
        } catch (error) {
          console.log('localStorage not available (SSR):', error);
        }
        
        if (devSession) {
          const user = JSON.parse(devSession);
          console.log('Restoring dev session for user:', user);
          setUser(user);
          setLoading(false);
          return;
        }

        console.log('No dev session found, checking Supabase session...');
        // Then check for regular Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log('Found Supabase session for user:', session.user.email);
          await loadUserProfile(session.user);
        } else {
          console.log('No Supabase session found');
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes (only for real Supabase sessions, not dev sessions)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          console.log('Auth state change event:', event, session?.user?.email);
          
          // Only handle Supabase auth changes, not dev sessions
          if (session?.user) {
            await loadUserProfile(session.user);
          } else {
            // Only clear user if there's no dev session
            const devSession = localStorage.getItem('dev-session');
            if (!devSession) {
              setUser(null);
            }
          }
        } catch (error) {
          console.error('Error in auth state change:', error);
          // Only clear user if there's no dev session
          const devSession = localStorage.getItem('dev-session');
          if (!devSession) {
            setUser(null);
          }
        } finally {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (supabaseUser: User) => {
    try {
      let profile = await getUserProfile(supabaseUser.id);
      
      // If no profile exists, create one
      if (!profile) {
        profile = await upsertProfile({
          id: supabaseUser.id,
          full_name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
          role: 'user'
        });
      }

      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email || undefined,
        full_name: profile.full_name || undefined,
        role: profile.role
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUser(null);
    }
  };

  const signIn = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) throw error;
  };

  const signInDev = async (name: string, role: 'user' | 'owner' = 'user') => {
    try {
      // Call the server-side dev login API
      const response = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, role }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Dev login failed');
      }

      const { user } = await response.json();
      
      console.log('Dev login successful, storing session for user:', user);
      
      // Store dev session in localStorage for persistence (only if available)
      try {
        localStorage.setItem('dev-session', JSON.stringify(user));
        console.log('Dev session stored in localStorage');
      } catch (error) {
        console.log('Could not store dev session in localStorage:', error);
      }
      
      setUser(user);
    } catch (error) {
      console.error('Error in signInDev:', error);
      throw error;
    }
  };

  const signOut = async () => {
    // Clear dev session if it exists (only if localStorage is available)
    try {
      localStorage.removeItem('dev-session');
      console.log('Dev session cleared from localStorage');
    } catch (error) {
      console.log('Could not clear dev session from localStorage:', error);
    }
    
    // Sign out from Supabase if there's a real session
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      // Ignore errors for dev sessions
    }
    
    setUser(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in');
    
    const updatedProfile = await upsertProfile({
      id: user.id,
      ...updates
    });

    setUser(prev => prev ? {
      ...prev,
      full_name: updatedProfile.full_name || prev.full_name,
      role: updatedProfile.role
    } : null);
  };

  const value = {
    user,
    loading,
    signIn,
    signInDev,
    signOut,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
