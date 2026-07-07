import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Link } from "wouter";

export default function SaasLogin() {
  const [gymSlug, setGymSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:4000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(gymSlug.trim() ? { gymSlug: gymSlug.trim() } : {}),
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Login failed");
      }

      localStorage.setItem("gymos_access_token", payload.tokens.accessToken);
      localStorage.setItem("gymos_refresh_token", payload.tokens.refreshToken);
      localStorage.setItem("gymos_user", JSON.stringify(payload.user));
      window.location.href = payload.user.role === "SUPER_ADMIN" ? "/super-admin" : "/saas/dashboard";
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-7">
        <h1 className="[font-family:var(--font-display)] text-3xl uppercase">Gym Login</h1>
        <p className="mt-2 text-sm text-white/70">Owner or staff login to your tenant workspace.</p>

        <form className="mt-6 space-y-4" onSubmit={handleLogin}>
          <div className="space-y-1.5">
            <Label htmlFor="gymSlug">Gym Slug Optional</Label>
            <Input
              id="gymSlug"
              placeholder="goldgym"
              value={gymSlug}
              onChange={(event) => setGymSlug(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="owner@goldgym.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <Button
            className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>

        <p className="mt-4 text-xs text-white/60">
          Don&apos;t have an account?{" "}
          <Link href="/saas" className="text-emerald-300 underline">
            Start free trial
          </Link>
        </p>
      </div>
    </div>
  );
}
