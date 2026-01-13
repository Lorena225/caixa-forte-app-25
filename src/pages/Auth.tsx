import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Building2, Loader2, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';

// Password strength validation
function getPasswordStrength(password: string): { score: number; checks: { label: string; passed: boolean }[] } {
  const checks = [
    { label: 'Mínimo 8 caracteres', passed: password.length >= 8 },
    { label: 'Letra maiúscula', passed: /[A-Z]/.test(password) },
    { label: 'Letra minúscula', passed: /[a-z]/.test(password) },
    { label: 'Número', passed: /[0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.passed).length;
  return { score, checks };
}

// Email validation
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false, fullName: false });
  const { toast } = useToast();
  const navigate = useNavigate();

  const passwordStrength = getPasswordStrength(password);
  const emailValid = isValidEmail(email);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailValid) {
      toast({
        title: 'Email inválido',
        description: 'Por favor, insira um email válido.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({
        title: 'Erro ao entrar',
        description: error.message === 'Invalid login credentials' 
          ? 'Email ou senha incorretos' 
          : error.message,
        variant: 'destructive',
      });
    } else {
      navigate('/');
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!fullName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, insira seu nome completo.',
        variant: 'destructive',
      });
      return;
    }

    if (!emailValid) {
      toast({
        title: 'Email inválido',
        description: 'Por favor, insira um email válido.',
        variant: 'destructive',
      });
      return;
    }

    if (passwordStrength.score < 3) {
      toast({
        title: 'Senha fraca',
        description: 'A senha deve ter pelo menos 8 caracteres, incluindo maiúsculas, minúsculas e números.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    const redirectUrl = `${window.location.origin}/`;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName },
      },
    });

    if (authError) {
      toast({
        title: 'Erro ao cadastrar',
        description: authError.message,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    if (authData.user) {
      // Criar empresa
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({ name: companyName || 'Minha Empresa' })
        .select()
        .single();

      if (companyError) {
        toast({
          title: 'Erro ao criar empresa',
          description: companyError.message,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Vincular usuário à empresa como admin
      await supabase.from('company_users').insert({
        company_id: company.id,
        user_id: authData.user.id,
        role: 'admin',
        is_default: true,
      });

      toast({
        title: 'Conta criada!',
        description: 'Bem-vindo ao Sistema Financeiro.',
      });
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Sistema Financeiro</h1>
          <p className="text-muted-foreground">Gerencie suas finanças de forma simples</p>
        </div>

        <Card>
          <Tabs defaultValue="login">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-login">Email</Label>
                    <Input
                      id="email-login"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setTouched(t => ({ ...t, email: true }))}
                      className={touched.email && !emailValid && email ? 'border-destructive' : ''}
                      required
                      autoComplete="email"
                    />
                    {touched.email && !emailValid && email && (
                      <p className="text-sm text-destructive">Email inválido</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-login">Senha</Label>
                    <div className="relative">
                      <Input
                        id="password-login"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Entrar
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome completo *</Label>
                    <Input
                      id="fullName"
                      placeholder="Seu nome"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      onBlur={() => setTouched(t => ({ ...t, fullName: true }))}
                      className={touched.fullName && !fullName.trim() ? 'border-destructive' : ''}
                      required
                      autoComplete="name"
                    />
                    {touched.fullName && !fullName.trim() && (
                      <p className="text-sm text-destructive">Nome é obrigatório</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nome da empresa</Label>
                    <Input
                      id="companyName"
                      placeholder="Minha Empresa"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      autoComplete="organization"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-signup">Email *</Label>
                    <Input
                      id="email-signup"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setTouched(t => ({ ...t, email: true }))}
                      className={touched.email && !emailValid && email ? 'border-destructive' : ''}
                      required
                      autoComplete="email"
                    />
                    {touched.email && !emailValid && email && (
                      <p className="text-sm text-destructive">Email inválido</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-signup">Senha *</Label>
                    <div className="relative">
                      <Input
                        id="password-signup"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 8 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onBlur={() => setTouched(t => ({ ...t, password: true }))}
                        required
                        autoComplete="new-password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {touched.password && password && (
                      <div className="space-y-1 pt-1">
                        {passwordStrength.checks.map((check, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            {check.passed ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            ) : (
                              <XCircle className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span className={check.passed ? 'text-green-600' : 'text-muted-foreground'}>
                              {check.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading || passwordStrength.score < 3 || !emailValid || !fullName.trim()}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar conta
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
