"use client";
import { useState } from "react";

export default function LoginPage() {
  const [userID, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false); // लोड होने की स्थिति के लिए

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true); // सबमिट होते ही लोडिंग शुरू करें

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userID, password }),
      });

      if (res.ok) {
        console.log("Logged in");
        location.reload();
      } else {
        const data = await res.json();
        setError(data.message || "Login failed");
        setIsLoading(false); // गड़बड़ होने पर बटन को वापस ठीक करें
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setIsLoading(false); // एरर आने पर बटन को वापस ठीक करें
    }
  };

  return (
    <div style={{ maxWidth: 320, margin: "50px auto", textAlign: "center" , backgroundColor:'white', padding: 20, borderRadius: 8}}>
      <h2 className="text-black" style={{ color: 'black', marginBottom: 20 }}>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="User ID"
          value={userID}
          onChange={(e) => setUserId(e.target.value)}
          required
          disabled={isLoading} // लोड होते समय इनपुट को बंद करें
          style={{ width: "100%", padding: 8, marginBottom: 10 , border:'1px solid gray', color:'black' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading} // लोड होते समय इनपुट को बंद करें
          style={{ width: "100%", padding: 8, marginBottom: 10 ,border:'1px solid gray', color:'black'}}
        />
        <button
          type="submit"
          disabled={isLoading} // लोड होते समय बटन को डिसेबल करें
          style={{
            width: "100%",
            padding: 8,
            background: isLoading ? "#555" : "black", // डिसेबल होने पर रंग बदलें
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
              {/* CSS से बना हुआ साधारण स्पिनर */}
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

      {/* स्पिनर को घुमाने के लिए CSS स्टाइल */}
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
