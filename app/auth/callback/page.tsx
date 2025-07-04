"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Optionally show a message or loader here
    // Redirect to login after a short delay
    setTimeout(() => {
      router.replace("/auth/login");
    }, 2000);
  }, [router]);

  return (
    <div style={{ textAlign: "center", marginTop: "2rem" }}>
      <h2>Email confirmed!</h2>
      <p>Redirecting to login...</p>
    </div>
  );
}