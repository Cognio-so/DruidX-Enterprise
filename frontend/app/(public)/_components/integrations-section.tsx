import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { InfiniteSlider } from "./infinite-slider";
import VSCodium from "./logos/VSCodium";
import MediaWiki from "./logos/MediaWiki";
import GooglePaLM from "./logos/GooglePaLM";
import { Gemini, Notion, Slack } from "./logos";
import Replit from "./logos/Replit";
import MagicUI from "./logos/MagicUI";
import { LogoIcon } from "./logo";

export default function IntegrationsSection() {
  return (
    <section>
      <div className="bg-muted dark:bg-background py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="max-w-lg space-y-6 text-left mx-auto lg:mx-0">
            <h2 className="text-balance text-3xl font-semibold md:text-4xl">
              Integrate with your favorite tools
            </h2>
            <p className="text-muted-foreground text-lg">
              Connect seamlessly with popular platforms and services to enhance
              your workflow. Automatically sync data, trigger actions, and keep
              everything in one place.
            </p>

            <Button
              variant="outline"
              size="lg"
              asChild
              className="rounded-full"
            >
              <Link href="/login" className="text-blue-500 font-semibold px-6">
                Explore Integrations
              </Link>
            </Button>
          </div>

          <div className="bg-muted/25 group relative mx-auto w-full max-w-[28rem] items-center justify-between space-y-6 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]">
            <div
              role="presentation"
              className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:32px_32px] opacity-50"
            ></div>
            <div>
              <InfiniteSlider gap={24} speed={20} speedOnHover={10}>
                <IntegrationCard>
                  <VSCodium />
                </IntegrationCard>
                <IntegrationCard>
                  <MediaWiki />
                </IntegrationCard>
                <IntegrationCard>
                  <GooglePaLM />
                </IntegrationCard>
                <IntegrationCard>
                  <Gemini />
                </IntegrationCard>
                <IntegrationCard>
                  <Notion />
                </IntegrationCard>
                <IntegrationCard>
                  <Slack />
                </IntegrationCard>
              </InfiniteSlider>
            </div>

            <div>
              <InfiniteSlider gap={24} speed={20} speedOnHover={10} reverse>
                <IntegrationCard>
                  <Gemini />
                </IntegrationCard>
                <IntegrationCard>
                  <Replit />
                </IntegrationCard>
                <IntegrationCard>
                  <MediaWiki />
                </IntegrationCard>
                <IntegrationCard>
                  <MagicUI />
                </IntegrationCard>
                <IntegrationCard>
                  <VSCodium />
                </IntegrationCard>
                <IntegrationCard>
                  <GooglePaLM />
                </IntegrationCard>
              </InfiniteSlider>
            </div>
            <div>
              <InfiniteSlider gap={24} speed={20} speedOnHover={10}>
                <IntegrationCard>
                  <Replit />
                </IntegrationCard>
                <IntegrationCard>
                  <MagicUI />
                </IntegrationCard>
                <IntegrationCard>
                  <Gemini />
                </IntegrationCard>
                <IntegrationCard>
                  <VSCodium />
                </IntegrationCard>
                <IntegrationCard>
                  <MediaWiki />
                </IntegrationCard>
                <IntegrationCard>
                  <GooglePaLM />
                </IntegrationCard>
              </InfiniteSlider>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const IntegrationCard = ({
  children,
  className,
  isCenter = false,
}: {
  children: React.ReactNode;
  className?: string;
  position?:
    | "left-top"
    | "left-middle"
    | "left-bottom"
    | "right-top"
    | "right-middle"
    | "right-bottom";
  isCenter?: boolean;
}) => {
  return (
    <div
      className={cn(
        "bg-background relative z-20 flex size-14 rounded-2xl border shadow-sm",
        className
      )}
    >
      <div className={cn("m-auto size-fit *:size-7", isCenter && "*:size-8")}>
        {children}
      </div>
    </div>
  );
};
