import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import HeroSection from "@/app/(public)/_components/hero-section";
import WallOfLoveSection from "@/app/(public)/_components/testimonials";
import FooterSection from "@/app/(public)/_components/footer";
import IntegrationsSection from "./_components/integrations-section";
import { HowItWorksSection } from "./_components/how-it-works-section";
import { RealUseCasesSection } from "./_components/real-use-cases-section";
import Pricing from "./_components/pricing";
import PricingComparator from "./_components/pricing-comparator";
import FAQsThree from "./_components/faqs-3";
import { FinalCTASection } from "./_components/final-cta-section";
import { StatsSection } from "./_components/stats";
import { PricingRealitySection } from "./_components/pricing-reality-section";
import { DruidxDifferenceSection } from "./_components/druidx-difference-section";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    if (session.user.role === "admin") {
      return redirect("/admin");
    } else if (session.user.role === "user") {
      return redirect("/dashboard");
    } else {
      return redirect("/login");
    }
  }

  return (
    <div className="min-h-screen w-full relative">
      <div className="relative z-10">
        <HeroSection />
        <WallOfLoveSection />
        <StatsSection />
        <PricingRealitySection />
        <DruidxDifferenceSection />
        <HowItWorksSection />
        <IntegrationsSection />
        <RealUseCasesSection />
        <Pricing />
        <PricingComparator />
        <FAQsThree />
        <FinalCTASection />
        <FooterSection />
      </div>
    </div>
  );
}
