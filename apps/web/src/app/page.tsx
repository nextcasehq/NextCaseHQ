import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oxiom | Business Operating System",
  description:
    "Oxiom is an AI-powered Business Operating System that transforms business knowledge into trusted execution and intelligent decisions.",
  keywords: [
    "Oxiom",
    "Business Operating System",
    "AI",
    "Business Intelligence",
    "Knowledge Graph",
    "Legal AI",
  ],
  openGraph: {
    title: "Oxiom | Business Operating System",
    description:
      "Turn your business knowledge into trusted execution with Oxiom.",
    url: "https://oxiom.in",
    siteName: "Oxiom",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Oxiom | Business Operating System",
    description:
      "AI-powered Business Operating System for intelligent execution.",
  },
  alternates: {
    canonical: "https://oxiom.in",
  },
};

export default function HomePage() {
  return (
    <main
      style={{
        backgroundImage: "url('/landing-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        color: "#3A2F1E",
      }}
    >
      {/* Navigation */}
      <header
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "24px 48px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            fontSize: "32px",
            fontWeight: 800,
            letterSpacing: "-0.5px",
          }}
        >
          Oxiom
        </div>

        <nav
          style={{
            display: "flex",
            gap: "32px",
            alignItems: "center",
          }}
        >
          <Link
            href="/login"
            style={{
              textDecoration: "none",
              color: "#3A2F1E",
              fontWeight: 600,
            }}
          >
            Sign In
          </Link>

          <Link
            href="/signup"
            style={{
              textDecoration: "none",
              background: "#3A2F1E",
              color: "#fff",
              padding: "12px 24px",
              borderRadius: "10px",
              fontWeight: 700,
            }}
          >
            Get Started
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <h1
          style={{
            fontSize: "64px",
            fontWeight: 800,
            margin: 0,
            letterSpacing: "-1.5px",
          }}
        >
          Oxiom
        </h1>

        <p
          style={{
            marginTop: "20px",
            maxWidth: "760px",
            fontSize: "22px",
            lineHeight: 1.6,
            color: "#4D4030",
          }}
        >
          Transform your business knowledge into trusted execution with an
          AI-powered Business Operating System.
        </p>

        {/* Search Bar */}
        <div
          style={{
            marginTop: "48px",
            width: "100%",
            maxWidth: "720px",
            display: "flex",
            background: "rgba(255,255,255,0.95)",
            borderRadius: "16px",
            padding: "10px",
            boxShadow: "0 15px 40px rgba(0,0,0,0.12)",
          }}
        >
          <input
            type="text"
            placeholder="Ask Oxiom anything about your business..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: "18px",
              padding: "16px",
              background: "transparent",
              color: "#3A2F1E",
            }}
          />

          <button
            style={{
              background: "#3A2F1E",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              padding: "0 28px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "16px",
            }}
          >
            Search
          </button>
        </div>

        {/* CTA */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            marginTop: "48px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Link
            href="/signup"
            style={{
              textDecoration: "none",
              background: "#3A2F1E",
              color: "#fff",
              padding: "16px 32px",
              borderRadius: "12px",
              fontWeight: 700,
            }}
          >
            Start Free
          </Link>

          <Link
            href="/login"
            style={{
              textDecoration: "none",
              background: "rgba(255,255,255,0.9)",
              color: "#3A2F1E",
              border: "2px solid #3A2F1E",
              padding: "16px 32px",
              borderRadius: "12px",
              fontWeight: 700,
            }}
          >
            Sign In
          </Link>
        </div>
      </section>
    </main>
  );
}