import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Company {
  id: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  companies: Company[];
  currentCompany: Company | null;
  setCurrentCompany: (company: Company | null) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserCompanies(session.user.id);
          }, 0);
        } else {
          setCompanies([]);
          setCurrentCompany(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserCompanies(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserCompanies = async (userId: string) => {
    const { data, error } = await supabase
      .from('company_users')
      .select(`
        role,
        companies:company_id (
          id,
          name
        )
      `)
      .eq('user_id', userId);

    if (!error && data) {
      const userCompanies = data.map((item: any) => ({
        id: item.companies.id,
        name: item.companies.name,
        role: item.role,
      }));
      setCompanies(userCompanies);
      
      const stored = localStorage.getItem('currentCompanyId');
      const found = userCompanies.find(c => c.id === stored);
      if (found) {
        setCurrentCompany(found);
      } else if (userCompanies.length > 0) {
        setCurrentCompany(userCompanies[0]);
        localStorage.setItem('currentCompanyId', userCompanies[0].id);
      }
    }
  };

  const handleSetCurrentCompany = (company: Company | null) => {
    setCurrentCompany(company);
    if (company) {
      localStorage.setItem('currentCompanyId', company.id);
    } else {
      localStorage.removeItem('currentCompanyId');
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setCurrentCompany(null);
    setCompanies([]);
    localStorage.removeItem('currentCompanyId');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      companies, 
      currentCompany, 
      setCurrentCompany: handleSetCurrentCompany,
      signOut 
    }}>
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
