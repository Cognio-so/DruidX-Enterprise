import React from "react";
import Link from "next/link";
import { ArrowRight, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { HeroHeader } from "./header";
import { AnimatedGroup } from "./animated-group";
import type { AnimatedGroupProps } from "./animated-group";
import { TextEffect } from "./text-effect";

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

            <div className="mx-auto max-w-7xl px-6 space-y-3">
              <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                <AnimatedGroup variants={transitionVariants}>
                  <Link
                    href="/login"
                    className="hover:bg-blue-500/10 dark:hover:border-t-blue-500/30 bg-blue-500/5 group mx-auto flex w-fit items-center gap-4 rounded-full border border-blue-200/20 p-1 pl-4 shadow-md shadow-blue-900/5 transition-colors duration-300 dark:border-t-blue-500/20 dark:shadow-blue-900/20"
                  >
                    <span className="text-foreground text-sm">
                      Trusted by agencies across 3 continents
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

                <h1 className="mx-auto mt-8 max-w-7xl text-balance text-5xl max-md:font-semibold md:text-7xl lg:mt-16 xl:text-[5.25rem]">
                  <TextEffect
                    preset="fade-in-blur"
                    speedSegment={0.3}
                    as="span"
                  >
                    Your Team&apos;s AI Workforce
                  </TextEffect>{" "}
                  <TextEffect
                    preset="fade-in-blur"
                    speedSegment={0.3}
                    as="span"
                    className="text-blue-500"
                  >
                    Built in Minutes, Not Months
                  </TextEffect>
                </h1>
                <p className="mx-auto mt-8 max-w-6xl text-balance text-xl">
                  Describe what you need. DruidX builds intelligent agents,
                  connects them to{" "}
                  <span className="text-blue-500">100+ tools</span>, and handles
                  the complexity. Choose from top models. Deploy in 3 minutes.
                  Start Building Free
                </p>

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
                        <span className="text-nowrap">
                          Build Your First Agent
                        </span>
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
                      <Video className="h-5 w-5" />
                      <span className="text-nowrap">See How it Works</span>
                    </Link>
                  </Button>
                </AnimatedGroup>
                <div className="mt-6 grid w-full max-w-8xl grid-cols-2 items-center gap-x-6 gap-y-3 text-sm text-muted-foreground sm:mx-auto sm:grid-cols-5">
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="text-base text-blue-500">
                      ✓
                    </span>
                    <span>No Coding Required</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span aria-hidden className="text-base text-blue-500">
                      ✓
                    </span>
                    <span>Advanced Document Intelligence</span>
                  </div>
                  <div className="flex items-center gap-2 ">
                    <span aria-hidden className="text-base text-blue-500">
                      ✓
                    </span>
                    <span>Pay-as-you-go</span>
                  </div>
                  <div className="flex items-center gap-2 ">
                    <span aria-hidden className="text-base text-blue-500">
                      ✓
                    </span>
                    <span>Personalised Onboarding</span>
                    <div className="flex items-center gap-2">
                      <span aria-hidden className="text-base text-blue-500">
                        ✓
                      </span>
                      <span>Cancle Anytime</span>
                    </div>
                  </div>
                </div>

                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 hover:border-blue-500/30 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                      <svg
                        className="w-6 h-6 text-purple-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      For Non-Technical Teams
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Build agents by chatting—no coding required
                    </p>
                  </div>

                  <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 hover:border-blue-500/30 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center mb-4">
                      <svg
                        className="w-6 h-6 text-yellow-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      For Budget-Conscious Leaders
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Pay-as-you-go beats overpriced subscriptions
                    </p>
                  </div>

                  <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 hover:border-blue-500/30 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                      <svg
                        className="w-6 h-6 text-blue-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      For Growing Teams
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Assign agents to departments, track centrally
                    </p>
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
      </main>
    </>
  );
}
