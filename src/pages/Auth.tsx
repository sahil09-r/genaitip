import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Radio, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { clearAuthCache, clearCorruptedAuthCache, isFetchError } from "@/lib/auth";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", fullName: "" });

  const handleOAuth = async (provider: "google" | "apple") => {
    setOauthLoading(provider);
    try {
      const { error } = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "OAuth sign-in failed",
        variant: "destructive",
      });
    } finally {
      setOauthLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearCorruptedAuthCache();
    setLoading(true);

    try {
      if (isLogin) {
        const signIn = async () => supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });

        let signInResult;
        try {
          signInResult = await signIn();
        } catch (error) {
          if (!isFetchError(error)) throw error;
          clearAuthCache();
          await supabase.auth.signOut({ scope: "local" });
          await new Promise((r) => setTimeout(r, 1000));
          signInResult = await signIn();
        }

        if (signInResult.error) throw signInResult.error;
        navigate("/");
      } else {
        const signUp = async () => supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: { full_name: form.fullName },
            emailRedirectTo: window.location.origin,
          },
        });

        let signUpResult;
        try {
          signUpResult = await signUp();
        } catch (error) {
          if (!isFetchError(error)) throw error;
          clearAuthCache();
          await supabase.auth.signOut({ scope: "local" });
          await new Promise((r) => setTimeout(r, 1000));
          signUpResult = await signUp();
        }

        if (signUpResult.error) throw signUpResult.error;
        toast({
          title: "Check your email",
          description: "We sent you a verification link to confirm your account.",
        });
      }
    } catch (error: unknown) {
      const isNetworkIssue = isFetchError(error);
      toast({
        title: isNetworkIssue ? "Network issue" : "Error",
        description: isNetworkIssue
          ? "Could not reach authentication service. We cleared stale session data and retried once. If it still fails, disable VPN/ad-blocker and retry."
          : (error instanceof Error ? error.message : "Something went wrong"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center glow-cyan">
            <Radio className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">GenAI-YOLO</h1>
            <p className="text-[11px] text-muted-foreground font-mono">Traffic Intelligence Platform</p>
          </div>
        </div>

        <div className="glass-panel p-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            {isLogin ? "Welcome back" : "Create account"}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {isLogin ? "Sign in to your dashboard" : "Sign up to get started"}
          </p>

          {/* OAuth Buttons */}
          <div className="flex gap-3 mb-5">
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2 bg-secondary border-border hover:bg-secondary/80"
              onClick={() => handleOAuth("google")}
              disabled={!!oauthLoading || loading}
            >
              <GoogleIcon />
              {oauthLoading === "google" ? "Loading..." : "Google"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2 bg-secondary border-border hover:bg-secondary/80"
              onClick={() => handleOAuth("apple")}
              disabled={!!oauthLoading || loading}
            >
              <AppleIcon />
              {oauthLoading === "apple" ? "Loading..." : "Apple"}
            </Button>
          </div>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-3 text-muted-foreground">or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Full Name"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="pl-10 bg-secondary border-border"
                  required
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="pl-10 bg-secondary border-border"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="pl-10 pr-10 bg-secondary border-border"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Button type="submit" className="w-full" disabled={loading || !!oauthLoading}>
              {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;

