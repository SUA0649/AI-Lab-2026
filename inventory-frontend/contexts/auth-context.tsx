"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase, type User, type UserRole } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string, role?: UserRole) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    name: string,
    role: UserRole
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if we're in demo mode (no Supabase configured)
    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (isDemoMode) {
      // In demo mode, check localStorage for demo user
      try {
        const demoUser = localStorage.getItem("demo-user");
        if (demoUser) {
          setUser(JSON.parse(demoUser));
        }
      } catch (error) {
        console.error("Error parsing demo user:", error);
        localStorage.removeItem("demo-user");
      }
      setLoading(false);
      return;
    }

    // Real Supabase auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          role: "admin", // Mock role - replace with actual role from database
          name: session.user.user_metadata?.name || "User",
          created_at: session.user.created_at,
        });
      }
      setLoading(false);
    });

    // Listen for changes on auth state
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          role: "admin", // Mock role
          name: session.user.user_metadata?.name || "User",
          created_at: session.user.created_at,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (
    email: string,
    password: string,
    _role: UserRole = "staff"
  ) => {
    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (isDemoMode) {
      throw new Error("Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.");
    }

    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    // Fetch user role from Supabase user metadata
    const session = data.session;
    if (session?.user) {
      const userRole = session.user.user_metadata?.role || "staff";
      setUser({
        id: session.user.id,
        email: session.user.email!,
        role: userRole,
        name: session.user.user_metadata?.name || "User",
        created_at: session.user.created_at,
      });
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: UserRole
  ) => {
    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (isDemoMode) {
      // In demo mode, create a demo user with the selected role
      const demoUser: User = {
        id: `demo-${role}-${Date.now()}`,
        email: email,
        role: role,
        name: name,
        created_at: new Date().toISOString(),
      };
      setUser(demoUser);
      localStorage.setItem("demo-user", JSON.stringify(demoUser));
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (isDemoMode) {
      setUser(null);
      localStorage.removeItem("demo-user");
      router.push("/login");
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
