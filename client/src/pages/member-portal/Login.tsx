import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dumbbell, LogIn } from "lucide-react";
import { useState } from "react";

const API_BASE = "https://4000-ip7j6bqy2pdjp23wy2koy-648bfd36.sg1.manus.computer/api/v1";

export default function MemberPortalLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch(`${API_BASE}/member-portal/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gymSlug: String(data.get("gymSlug") ?? "").trim().toLowerCase(),
          identifier: String(data.get("identifier") ?? "").trim(),
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Login failed");

      // Store member session
      localStorage.setItem("gymos_member", JSON.stringify(payload.member));
      localStorage.setItem("gymos_member_gym", JSON.stringify(payload.gym));

      window.location.href = "/member-portal/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/15">
            <Dumbbell className="h-7 w-7 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Member Portal</h1>
            <p className="mt-1 text-sm text-white/50">Access your gym profile and history</p>
          </div>
        </div>

        <Card className="border-white/10 bg-white/[0.04] text-white">
          <CardHeader>
            <CardTitle className="text-lg">Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleLogin}>
              <div className="space-y-1.5">
                <Label>Gym Slug</Label>
                <Input
                  name="gymSlug"
                  required
                  placeholder="e.g. golds"
                  className="border-white/10 bg-slate-950"
                />
                <p className="text-xs text-white/40">The short name of your gym (ask your gym admin)</p>
              </div>

              <div className="space-y-1.5">
                <Label>Member Code or Email</Label>
                <Input
                  name="identifier"
                  required
                  placeholder="MBR-123456 or your email"
                  className="border-white/10 bg-slate-950"
                />
                <p className="text-xs text-white/40">Your member code (on your membership card) or registered email</p>
              </div>

              {error ? (
                <div className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
              >
                {loading ? (
                  "Signing in..."
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Sign In to Portal
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-white/30">
          This portal is read-only. Contact your gym admin to update your information.
        </p>
      </div>
    </div>
  );
}
