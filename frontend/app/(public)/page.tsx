import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import HeroSection from "@/app/(public)/_components/hero-section";
import LogoCloud from "@/app/(public)/_components/logo-cloud";
import FeaturesSection from "@/app/(public)/_components/features-8";
import IntegrationsSection from "@/app/(public)/_components/integrations-7";
import WallOfLoveSection from "@/app/(public)/_components/testimonials";
import Pricing from "@/app/(public)/_components/pricing";
import FAQsThree from "@/components/faqs-3";
import FooterSection from "@/app/(public)/_components/footer";
import ContentSection from "./_components/content-7";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    if (session.user.role === "admin") {
      return redirect("/admin");
    }else if (session.user.role === "user") {
      return redirect("/dashboard");
    }
    else{
      return redirect("/login");
    }
  }

  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <IntegrationsSection />
      <ContentSection />
      <WallOfLoveSection />
      <Pricing />
      <FAQsThree />
      <FooterSection />
    </>
  );
}
