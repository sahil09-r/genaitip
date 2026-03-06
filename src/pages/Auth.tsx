import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Radio, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { clearAuthCache, clearCorruptedAuthCache, isFetchError } from "@/lib/auth";

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", fullName: "" });

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

            <Button type="submit" className="w-full" disabled={loading}>
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

