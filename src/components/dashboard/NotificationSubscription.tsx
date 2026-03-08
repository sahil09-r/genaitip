import { useState } from "react";
import emailjs from "@emailjs/browser";
import { Bell, Mail, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

const NotificationSubscription = () => {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

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

      const { error } = await supabase.from("notification_subscriptions").insert({
        user_id: user.id,
        email: email || null,
        phone: phone || null,
        notify_email: !!email,
        notify_sms: !!phone,
      });
      if (error) throw error;

      // Send confirmation email via EmailJS
      if (email) {
        await emailjs.send(
          "service_gce8cg6",
          "template_yu1x3e9",
          {
            to_email: email,
            contact_name: "Subscriber",
            sender_name: "GenAI-YOLO",
            sender_email: user.email || "",
            message: "You have been subscribed to real-time traffic alerts from GenAI-YOLO Traffic Intelligence Platform. You will receive notifications for critical events.",
          },
          "1bHGPrVM0tl7vQ2pU"
        );
      }

      toast({ title: "Subscribed!", description: "You'll receive real-time traffic notifications." });
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
