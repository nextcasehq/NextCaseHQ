import React from "react";
import JsonLd from "@/components/seo/JsonLd";
import HeroSection from "@/components/landing/sections/HeroSection";
import TrustBar from "@/components/landing/sections/TrustBar";
import Features from "@/components/landing/sections/Features";
import Security from "@/components/landing/sections/Security";
import Workflow from "@/components/landing/sections/Workflow";
import CtaBand from "@/components/landing/sections/CtaBand";
import SiteFooter from "@/components/landing/sections/SiteFooter";

export default function LandingPageContent() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans text-[#111111] selection:bg-[#8A6D2F] selection:text-white">
      {/* Structural JSON-LD schemas for search crawlers */}
      <JsonLd type="Organization" />
      <JsonLd type="WebSite" />
      <JsonLd type="SoftwareApplication" />

      <HeroSection />
      <TrustBar />
      <Features />
      <Security />
      <Workflow />
      <CtaBand />
      <SiteFooter />
    </div>
  );
}
