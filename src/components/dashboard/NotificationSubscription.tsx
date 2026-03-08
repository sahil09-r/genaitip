import { useState, useEffect } from "react";
import emailjs from "@emailjs/browser";
import { Bell, Mail, Phone, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

interface Subscription {
  id: string;
  email: string | null;
  phone: string | null;
  notify_email: boolean;
  notify_sms: boolean;
}

const NotificationSubscription = () => {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subsLoading, setSubsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubsLoading(false); return; }
    const { data } = await supabase
      .from("notification_subscriptions")
      .select("id, email, phone, notify_email, notify_sms")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setSubscriptions(data);
    setSubsLoading(false);
  };

  const handleUnsubscribe = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from("notification_subscriptions").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Unsubscribed", description: "Alert subscription removed." });
    }
    setDeletingId(null);
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email && !phone) {
      toast({ title: "Please enter email or phone number", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const subscribedEmail = email.trim() || null;
      const subscribedPhone = phone.trim() || null;

      const { data, error } = await supabase.from("notification_subscriptions").insert({
        user_id: user.id,
        email: subscribedEmail,
        phone: subscribedPhone,
        notify_email: !!subscribedEmail,
        notify_sms: !!subscribedPhone,
      }).select().single();
      if (error) throw error;

      // Send confirmation email via EmailJS to the entered email
      if (subscribedEmail) {
        await emailjs.send(
          "service_gce8cg6",
          "template_yu1x3e9",
          {
            to_email: subscribedEmail,
            contact_name: "Subscriber",
            sender_name: "GenAI-YOLO",
            sender_email: "noreply@genai-yolo.app",
            message: `You (${subscribedEmail}) have been subscribed to real-time traffic alerts from GenAI-YOLO Traffic Intelligence Platform.`,
          },
          "1bHGPrVM0tl7vQ2pU"
        );
      }

      if (data) setSubscriptions((prev) => [data, ...prev]);
      toast({ title: "Subscribed!", description: `Alerts will be sent to ${subscribedEmail || subscribedPhone}.` });
      setEmail("");
      setPhone("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Get Real-Time Alerts</span>
      </div>

      {/* Existing subscriptions */}
      {!subsLoading && subscriptions.length > 0 && (
        <div className="mb-3 space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Active Subscriptions</p>
          {subscriptions.map((sub) => (
            <div key={sub.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/50 border border-border">
              <div className="flex items-center gap-1.5 min-w-0 text-xs text-foreground font-mono truncate">
                {sub.email && <><Mail className="w-3 h-3 text-primary shrink-0" /><span className="truncate">{sub.email}</span></>}
                {sub.phone && <><Phone className="w-3 h-3 text-primary shrink-0" /><span>{sub.phone}</span></>}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-destructive hover:text-destructive shrink-0"
                onClick={() => handleUnsubscribe(sub.id)}
                disabled={deletingId === sub.id}
              >
                {deletingId === sub.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              </Button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubscribe} className="space-y-3">
        <div className="relative">
          <Mail className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10 bg-secondary border-border h-9 text-sm"
          />
        </div>
        <div className="relative">
          <Phone className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            type="tel"
            placeholder="Phone number (with country code)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="pl-10 bg-secondary border-border h-9 text-sm"
          />
        </div>
        <Button type="submit" size="sm" className="w-full" disabled={loading}>
          {loading ? "Subscribing..." : "Subscribe to Alerts"}
        </Button>
      </form>
    </div>
  );
};

export default NotificationSubscription;
