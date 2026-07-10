"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";

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
    <div style={{ maxWidth: 320, margin: "50px auto", textAlign: "center", backgroundColor: 'white', padding: 20, borderRadius: 8 }}>
      <h2 className="text-black" style={{ color: 'black', marginBottom: 20 }}>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Email or Employee ID"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          disabled={isLoading}
          style={{ width: "100%", padding: 8, marginBottom: 10, border: '1px solid gray', color: 'black' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
          style={{ width: "100%", padding: 8, marginBottom: 10, border: '1px solid gray', color: 'black' }}
        />
        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: "100%",
            padding: 8,
            background: isLoading ? "#555" : "black",
            color: "white",
            border: "none",
            cursor: isLoading ? "not-allowed" : "pointer",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "10px"
          }}
        >
          {isLoading ? (
            <>
              <span style={{
                width: "16px",
                height: "16px",
                border: "2px solid white",
                borderTop: "2px solid transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
              }}></span>
              <span>Loading...</span>
            </>
          ) : (
            "Login"
          )}
        </button>
      </form>
      {error && <p style={{ color: "red", marginTop: 10 }}>{error}</p>}

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
