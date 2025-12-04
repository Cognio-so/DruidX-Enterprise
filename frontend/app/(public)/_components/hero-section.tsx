import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { HeroHeader } from "./header";
import { AnimatedGroup } from "./animated-group";
import type { AnimatedGroupProps } from "./animated-group";
import { TextEffect } from "./text-effect";
import { PricingRealitySection } from "./pricing-reality-section";
import LogoCloud from "./logo-cloud";

const transitionVariants: AnimatedGroupProps["variants"] = {
  item: {
    hidden: {
      opacity: 0,
      filter: "blur(12px)",
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        type: "spring" as const,
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
};

export default function HeroSection() {
  return (
    <>
      <HeroHeader />
      <main className="overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 isolate hidden opacity-65 contain-strict lg:block"
        >
          <div className="w-140 h-320 -translate-y-87.5 absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,rgba(59,130,246,0.1)_0,rgba(59,130,246,0.05)_50%,transparent_80%)]" />
          <div className="h-320 absolute left-0 top-0 w-60 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(59,130,246,0.1)_0,rgba(59,130,246,0.05)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="h-320 -translate-y-87.5 absolute left-0 top-0 w-60 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,rgba(59,130,246,0.1)_0,rgba(59,130,246,0.05)_80%,transparent_100%)]" />
        </div>
        <section>
          <div className="relative pt-24 md:pt-36">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,transparent_75%)]"
            />

            <div className="mx-auto max-w-7xl px-6">
              <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                <AnimatedGroup variants={transitionVariants}>
                  <Link
                    href="/login"
                    className="hover:bg-blue-500/10 dark:hover:border-t-blue-500/30 bg-blue-500/5 group mx-auto flex w-fit items-center gap-4 rounded-full border border-blue-200/20 p-1 pl-4 shadow-md shadow-blue-900/5 transition-colors duration-300 dark:border-t-blue-500/20 dark:shadow-blue-900/20"
                  >
                    <span className="text-foreground text-sm">
                      Your Team&apos;s AI Workforce
                    </span>
                    <span className="dark:border-background block h-4 w-0.5 border-l bg-blue-500/20 dark:bg-blue-500/20"></span>

                    <div className="bg-background group-hover:bg-blue-500/10 size-6 overflow-hidden rounded-full duration-500">
                      <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                        <span className="flex size-6">
                          <ArrowRight className="m-auto size-3 text-blue-500" />
                        </span>
                        <span className="flex size-6">
                          <ArrowRight className="m-auto size-3 text-blue-500" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </AnimatedGroup>

                <TextEffect
                  preset="fade-in-blur"
                  speedSegment={0.3}
                  as="h1"
                  className="mx-auto mt-8 max-w-4xl text-balance text-5xl max-md:font-semibold md:text-7xl lg:mt-16 xl:text-[5.25rem]"
                >
                  Built in Minutes, Not Months
                </TextEffect>
                <TextEffect
                  per="line"
                  preset="fade-in-blur"
                  speedSegment={0.3}
                  delay={0.5}
                  as="p"
                  className="mx-auto mt-8 max-w-2xl text-balance text-lg"
                >
                  Just describe what you need. DruidX builds intelligent agents
                  for every team, connects them to 100+ tools, and handles the
                  complexity. No code. No overpriced subscriptions. No wasted
                  credits.
                </TextEffect>

                <AnimatedGroup
                  variants={{
                    container: {
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                          delayChildren: 0.75,
                        },
                      },
                    },
                    ...transitionVariants,
                  }}
                  className="mt-12 flex flex-col items-center justify-center gap-2 md:flex-row"
                >
                  <div
                    key={1}
                    className="bg-blue-600/10 rounded-[calc(var(--radius-xl)+0.125rem)] border border-blue-500/20 p-0.5"
                  >
                    <Button
                      asChild
                      size="lg"
                      className="rounded-xl px-5 text-base bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Link href="/login">
                        <span className="text-nowrap">Start Building Free</span>
                      </Link>
                    </Button>
                  </div>
                  <Button
                    key={2}
                    asChild
                    size="lg"
                    variant="ghost"
                    className="h-10.5 rounded-xl px-5 hover:bg-blue-500/10 hover:text-blue-600"
                  >
                    <Link href="/login">
                      <span className="text-nowrap">Watch How It Works</span>
                    </Link>
                  </Button>
                </AnimatedGroup>
                <div className="mt-6 grid w-full max-w-8xl grid-cols-2 items-center gap-x-6 gap-y-3 text-sm text-muted-foreground sm:mx-auto sm:grid-cols-5">
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="text-base text-blue-500">
                      ✓
                    </span>
                    <span>No credit card required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="text-base text-blue-500">
                      ✓
                    </span>
                    <span>No minimum spend</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="text-base text-blue-500">
                      ✓
                    </span>
                    <span>Cancel anytime</span>
                  </div>
                  <div className="flex items-center gap-2 ">
                    <span aria-hidden className="text-base text-blue-500">
                      ✓
                    </span>
                    <span>100+ tool integrations included</span>
                  </div>
                  <div className="flex items-center gap-2 ">
                    <span aria-hidden className="text-base text-blue-500">
                      ✓
                    </span>
                    <span>Pay only for what you use</span>
                  </div>
                </div>
              </div>
            </div>

            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                      delayChildren: 0.75,
                    },
                  },
                },
                ...transitionVariants,
              }}
            >
              <div className="mask-b-from-55% relative -mr-56 mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12 md:mt-20">
                <div className="inset-shadow-2xs ring-blue-500/10 dark:inset-shadow-white/20 bg-background relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-blue-500/10 p-4 shadow-lg shadow-blue-900/10 ring-1">
                  <Image
                    className="bg-background aspect-15/8 relative hidden rounded-2xl dark:block"
                    src="/app-screen.png"
                    alt="app screen"
                    width="2700"
                    height="1440"
                  />
                  <Image
                    className="z-2 border-border/25 aspect-15/8 relative rounded-2xl border dark:hidden"
                    src="/app-screen-light.png"
                    alt="app screen"
                    width="2700"
                    height="1440"
                  />
                </div>
              </div>
            </AnimatedGroup>
          </div>
        </section>
        <LogoCloud />
        <PricingRealitySection />
      </main>
    </>
  );
}
