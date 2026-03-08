import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, User, Mail, Save, ShieldAlert, Plus, Trash2, Send, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Profile state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Emergency contacts state
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [addingContact, setAddingContact] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadContacts();
    }
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, phone, alert_message")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (data) {
      setFullName(data.full_name || "");
      setPhone(data.phone || "");
      setAlertMessage(data.alert_message || "I need help! This is an emergency alert.");
    }
    setProfileLoading(false);
  };

  const loadContacts = async () => {
    const { data } = await supabase
      .from("emergency_contacts")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true });

    if (data) setContacts(data);
  };

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone, alert_message: alertMessage })
      .eq("user_id", user!.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Profile updated successfully." });
    }
    setSaving(false);
  };

  const addContact = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      toast({ title: "Error", description: "Name and phone are required.", variant: "destructive" });
      return;
    }
    setAddingContact(true);
    const { error } = await supabase
      .from("emergency_contacts")
      .insert({ user_id: user!.id, name: newName.trim(), phone: newPhone.trim() });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewName("");
      setNewPhone("");
      loadContacts();
      toast({ title: "Added", description: "Emergency contact added." });
    }
    setAddingContact(false);
  };

  const deleteContact = async (id: string) => {
    await supabase.from("emergency_contacts").delete().eq("id", id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
    toast({ title: "Removed", description: "Contact removed." });
  };

  const sendAlert = async (contact: EmergencyContact) => {
    setSendingTo(contact.id);
    try {
      const message = alertMessage
        ? `${alertMessage}\n\n— Sent by ${fullName || user?.email || "User"} via GenAI-YOLO`
        : `Emergency alert from ${fullName || user?.email || "User"}!\n\n— Sent via GenAI-YOLO`;

      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: { to: contact.phone, text: message },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Alert Sent!",
        description: `Emergency message sent to ${contact.name} (${contact.phone}).`,
      });
    } catch (err: unknown) {
      toast({
        title: "Failed to send",
        description: err instanceof Error ? err.message : "Could not send SMS.",
        variant: "destructive",
      });
    } finally {
      setSendingTo(null);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4 gap-2 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>

        <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="w-full grid grid-cols-2 bg-secondary">
            <TabsTrigger value="profile" className="gap-2"><User className="w-4 h-4" /> Profile</TabsTrigger>
            <TabsTrigger value="help" className="gap-2"><ShieldAlert className="w-4 h-4" /> Emergency Help</TabsTrigger>
          </TabsList>

          {/* ── Profile Tab ── */}
          <TabsContent value="profile">
            <Card className="glass-panel border-border">
              <CardHeader>
                <CardTitle className="text-lg">Profile Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground mb-1.5 block">Email</Label>
                  <Input value={user?.email || ""} disabled className="bg-muted border-border opacity-60" />
                </div>
                <div>
                  <Label className="text-muted-foreground mb-1.5 block">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" className="pl-10 bg-secondary border-border" />
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground mb-1.5 block">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1234567890" className="pl-10 bg-secondary border-border" />
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground mb-1.5 block">Emergency Alert Message</Label>
                  <Textarea
                    value={alertMessage}
                    onChange={(e) => setAlertMessage(e.target.value)}
                    placeholder="Custom message sent when you trigger an alert…"
                    className="bg-secondary border-border min-h-[100px]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">This message will be sent to your emergency contacts when you tap "Send Alert".</p>
                </div>
                <Button onClick={saveProfile} disabled={saving} className="w-full gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Saving…" : "Save Profile"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Help Tab ── */}
          <TabsContent value="help">
            <Card className="glass-panel border-border">
              <CardHeader>
                <CardTitle className="text-lg">Emergency Contacts</CardTitle>
                <CardDescription>Add contacts who will receive your alert message via SMS</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Add new contact */}
                <div className="flex flex-col gap-3 p-4 rounded-lg bg-secondary/50 border border-border">
                  <p className="text-sm font-medium text-foreground">Add a contact</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" className="bg-secondary border-border" />
                    <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+1234567890" className="bg-secondary border-border" />
                  </div>
                  <Button onClick={addContact} disabled={addingContact} size="sm" className="gap-2 w-fit">
                    {addingContact ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add Contact
                  </Button>
                </div>

                {/* List contacts */}
                {contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No emergency contacts added yet.</p>
                ) : (
                  <div className="space-y-3">
                    {contacts.map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/40 border border-border">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{c.phone}</p>
                        </div>
                        <div className="flex gap-2 shrink-0 ml-3">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => sendAlert(c)}
                            disabled={sendingTo === c.id}
                            className="gap-1.5"
                          >
                            {sendingTo === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            Send Alert
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteContact(c.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Current alert message preview */}
                {alertMessage && (
                  <div className="p-3 rounded-lg border border-border bg-muted/40">
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Alert message preview:</p>
                    <p className="text-sm text-foreground italic">"{alertMessage}"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default Settings;
