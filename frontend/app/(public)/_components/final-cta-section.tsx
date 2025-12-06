import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function FinalCTASection() {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-blue-600/10" />

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 left-1/4 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -bottom-1/2 right-1/4 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6">
        <div className="flex flex-col items-center space-y-8 text-center">
          {/* Header */}
          <div className="space-y-4">
            <h2 className="text-4xl max-w-xl mx-auto font-bold tracking-tight sm:text-5xl md:text-6xl">
              Your First Agent Is{" "}
              <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                10 Minutes Away
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
              Join agencies, startups, and remote teams that stopped paying the
              AI subscription tax and started building their AI workforce.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
            <Button
              asChild
              size="lg"
              className="group relative overflow-hidden px-8 py-6 text-base font-semibold shadow-lg transition-all hover:shadow-xl bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
            >
              <Link href="/login">
                <span className="relative z-10 text-white">
                  Start Building Agents
                </span>
                <div className="absolute inset-0 -z-0 bg-gradient-to-r from-blue-600 to-blue-500 transition-transform group-hover:scale-105" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-2 px-8 py-6 text-base font-semibold transition-all hover:bg-blue-600/5 border-blue-200 text-blue-900 dark:text-blue-100 dark:border-blue-800"
            >
              <Link href="/login">Talk to Our Team</Link>
            </Button>
          </div>

          {/* Final Friction Remover */}
          <div className="flex flex-col items-center gap-3 pt-4 sm:flex-row sm:gap-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-5 w-5 text-blue-600" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-5 w-5 text-blue-600" />
              <span>Upgrade only when you need team features</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
