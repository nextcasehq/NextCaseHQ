import Link from "next/link"

export default function HomePage() {
  return (
    <main
      style={{
        backgroundImage: "url('/landing-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        color: "#3a2f1e"
      }}
    >
      <h1 style={{fontSize: "48px", fontWeight: "bold", marginBottom: "16px"}}>
        Oxiom
      </h1>
      <p style={{fontSize: "20px", marginBottom: "32px"}}>
        Your AI Legal Assistant
      </p>
      <div style={{display: "flex", gap: "16px"}}>
        <Link href="/login" style={{padding: "12px 24px", background: "#3a2f1e", color: "white", borderRadius: "8px", textDecoration: "none"}}>
          Sign In
        </Link>
        <Link href="/signup" style={{padding: "12px 24px", background: "white", color: "#3a2f1e", borderRadius: "8px", textDecoration: "none", border: "1px solid #3a2f1e"}}>
          Get Started
        </Link>
      </div>
    </main>
  )
}
