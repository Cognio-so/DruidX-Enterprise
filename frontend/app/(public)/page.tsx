import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import HeroSection from "@/app/(public)/_components/hero-section";

import WallOfLoveSection from "@/app/(public)/_components/testimonials";
import FooterSection from "@/app/(public)/_components/footer";
import IntegrationsSection from "./_components/integrations-section";
import { DruidxDifferenceSection } from "./_components/druidx-difference-section";
import { HowItWorksSection } from "./_components/how-it-works-section";
import { RealUseCasesSection } from "./_components/real-use-cases-section";
import Pricing from "./_components/pricing";
import PricingComparator from "./_components/pricing-comparator";
import FAQsThree from "./_components/faqs-3";
import { FinalCTASection } from "./_components/final-cta-section";
import { StatsSection } from "./_components/stats";

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
      {/* Azure Depths background removed */}

      <div className="relative z-10">
        <HeroSection />
        <IntegrationsSection />
        <DruidxDifferenceSection />
        <HowItWorksSection />
        <RealUseCasesSection />
        <WallOfLoveSection />
        <Pricing />
        <PricingComparator />
        <FAQsThree />
        <StatsSection />
        <FinalCTASection />
        <FooterSection />
      </div>
    </div>
  );
}
