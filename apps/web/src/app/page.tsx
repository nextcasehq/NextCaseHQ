import Link from "next/link"

export default function HomePage() {
  return (
    <main
      style={{
        backgroundImage: "url('/landing-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        color: "#3a2f1e"
      }}
    >
      <h1 style={{fontSize: "56px", fontWeight: "800", marginBottom: "16px"}}>
        Oxiom
      </h1>
      <p style={{fontSize: "20px", marginBottom: "40px", opacity: 0.9}}>
        Your AI Legal Assistant
      </p>
      <div style={{display: "flex", gap: "16px", flexWrap: "wrap"}}>
        <Link href="/login" style={{padding: "14px 28px", background: "#3a2f1e", color: "white", borderRadius: "10px", textDecoration: "none", fontWeight: "600"}}>
          Sign In
        </Link>
        <Link href="/signup" style={{padding: "14px 28px", background: "white", color: "#3a2f1e", borderRadius: "10px", textDecoration: "none", fontWeight: "600", border: "2px solid #3a2f1e"}}>
          Get Started
        </Link>
      </div>
    </main>
  )
}
