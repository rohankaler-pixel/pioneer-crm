cat << 'EOF' > src/components/AuthGate.tsx
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface CrmUser {
  id: string;
  username: string;
  full_name: string;
  role: "ADMIN" | "COUNSELLOR" | "TEACHER";
}

export default function AuthGate({
  children,
}: {
  children: (user: CrmUser, logout: () => void) => React.ReactNode;
}) {
  const [user, setUser] = useState<CrmUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("pioneer_crm_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem("pioneer_crm_user");
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const { data, error: dbError } = await supabase
        .from("crm_users")
        .select("id, username, full_name, role")
        .eq("username", username.trim().toLowerCase())
        .eq("password", password.trim())
        .single();

      if (dbError || !data) {
        setError("Invalid username or password. Please try again.");
      } else {
        const loggedUser: CrmUser = {
          id: data.id,
          username: data.username,
          full_name: data.full_name,
          role: data.role as "ADMIN" | "COUNSELLOR" | "TEACHER",
        };
        localStorage.setItem("pioneer_crm_user", JSON.stringify(loggedUser));
        setUser(loggedUser);
      }
    } catch {
      setError("Unable to verify credentials. Check connection.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("pioneer_crm_user");
    setUser(null);
    setUsername("");
    setPassword("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white text-sm">
        Loading Pioneer Academy CRM...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              PIONEER ACADEMY, BIKANER
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Staff & Operations CRM Portal
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/40 text-red-400 text-xs p-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. komal, rohit, sumit"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition cursor-pointer mt-2"
            >
              {submitting ? "Signing in..." : "Sign In to CRM"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children(user, handleLogout)}</>;
}
EOF