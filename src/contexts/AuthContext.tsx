import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "executor" | "user";

interface Profile {
  id: string;
  user_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  can_manage_users: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCompany {
  company_id: string;
  company_name: string;
  role: AppRole;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isGlobalAdmin: boolean;
  isChiefAdmin: boolean;
  companies: UserCompany[];
  currentCompanyId: string | null;
  currentCompanyName: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setCurrentCompanyId: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [companies, setCompanies] = useState<UserCompany[]>([]);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [isChiefAdmin, setIsChiefAdmin] = useState(false);
  const [currentCompanyId, setCurrentCompanyIdState] = useState<string | null>(
    localStorage.getItem("currentCompanyId")
  );
  const [isLoading, setIsLoading] = useState(true);

  const currentCompany = companies.find(c => c.company_id === currentCompanyId);
  const role = currentCompany?.role || null;
  const currentCompanyName = currentCompany?.company_name || null;

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (profileData) {
      setProfile(profileData as Profile);
    }
  };

  const fetchGlobalRole = async (userId: string): Promise<{ isAdmin: boolean; isChief: boolean }> => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();
    const isAdmin = data?.role === "admin";
    const isChief = data?.role === "chief_admin";
    setIsGlobalAdmin(isAdmin);
    setIsChiefAdmin(isChief);
    return { isAdmin, isChief };
  };

  const fetchCompanies = async (userId: string): Promise<UserCompany[]> => {
    const { data, error } = await (supabase.rpc as any)("get_user_companies", {
      _user_id: userId,
    });
    
    if (!error && data) {
      const userCompanies = (data as any[]).map((d: any) => ({
        company_id: d.company_id,
        company_name: d.company_name,
        role: d.role as AppRole,
      }));
      setCompanies(userCompanies);
      return userCompanies;
    }
    return [];
  };

  const autoSelectCompany = (userCompanies: UserCompany[], globalRole: { isAdmin: boolean; isChief: boolean }) => {
    const savedCompanyId = localStorage.getItem("currentCompanyId");
    if (userCompanies.length === 1 && !globalRole.isAdmin) {
      setCurrentCompanyIdState(userCompanies[0].company_id);
      localStorage.setItem("currentCompanyId", userCompanies[0].company_id);
    } else if (savedCompanyId && userCompanies.some(c => c.company_id === savedCompanyId)) {
      setCurrentCompanyIdState(savedCompanyId);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const [, userCompanies, globalRole] = await Promise.all([
        fetchProfile(user.id),
        fetchCompanies(user.id),
        fetchGlobalRole(user.id),
      ]);
      autoSelectCompany(userCompanies, globalRole);
    }
  };

  const setCurrentCompanyId = (id: string) => {
    setCurrentCompanyIdState(id);
    localStorage.setItem("currentCompanyId", id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          setTimeout(async () => {
            const [, userCompanies, globalRole] = await Promise.all([
              fetchProfile(currentSession.user.id),
              fetchCompanies(currentSession.user.id),
              fetchGlobalRole(currentSession.user.id),
            ]);
            autoSelectCompany(userCompanies, globalRole);
            setIsLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setCompanies([]);
          setIsGlobalAdmin(false);
          setIsChiefAdmin(false);
          setCurrentCompanyIdState(null);
          localStorage.removeItem("currentCompanyId");
          setIsLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!existingSession) {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setCompanies([]);
    setIsGlobalAdmin(false);
    setIsChiefAdmin(false);
    setCurrentCompanyIdState(null);
    localStorage.removeItem("currentCompanyId");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isGlobalAdmin,
        isChiefAdmin,
        companies,
        currentCompanyId,
        currentCompanyName,
        isLoading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        setCurrentCompanyId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
