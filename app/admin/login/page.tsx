"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        identifier,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid email/employee ID or password");
        setIsLoading(false);
      } else {
        // Middleware routes staff to /admin and employees to /portal (and forces
        // a password reset when required).
        window.location.href = "/admin";
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative w-16 h-16 mb-3">
            <Image src="/logo.png" alt="Sachin Security Services" fill className="object-contain" priority />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Welcome to Sachin Security</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Email or Employee ID"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-100"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Signing in…
              </>
            ) : (
              "Login"
            )}
          </button>
        </form>

        {error && <p className="text-red-600 text-sm mt-3 text-center">{error}</p>}

        <p className="text-xs text-gray-400 text-center mt-6">Sachin Security Services Pvt. Ltd.</p>
      </div>
    </div>
  );
}
