'use client'

import type { ReactNode } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { DynamicIcon, type IconName } from 'lucide-react/dynamic'
import Link from 'next/link'

type FAQItem = {
    id: string
    icon: IconName
    question: string
    answer: ReactNode
}

export default function FAQsThree() {
    const faqItems: FAQItem[] = [
        {
            id: 'item-1',
            icon: 'bot',
            question: '“We already pay for ChatGPT Plus. Why switch?”',
            answer: (
                <>
                    <p>
                        ChatGPT Plus gives one model to one person. DruidX gives your entire team GPT-4 plus Claude, Gemini, Llama, and more—with workflow
                        automation and team controls baked in.
                    </p>
                    <p className="mt-3">
                        <strong>Math:</strong> 10 people on ChatGPT Plus = $200/month. 10 people on DruidX Team = $200/month + credits, but you unlock 10× the
                        capability.
                    </p>
                </>
            ),
        },
        {
            id: 'item-2',
            icon: 'wand',
            question: '“Sounds complicated. We’re not a tech company.”',
            answer: (
                <>
                    <p>
                        Neither are most of our customers. Agencies, consultancies, and small businesses with zero engineers use DruidX daily. You build agents
                        by talking to the builder.
                    </p>
                    <p className="mt-3 italic">
                        “I need an agent that summarizes daily news in our industry and posts to Slack.” — DruidX builds it. That’s the interface.
                    </p>
                </>
            ),
        },
        {
            id: 'item-3',
            icon: 'trending-up',
            question: '“What if we outgrow it?”',
            answer: (
                <>
                    <p>
                        DruidX scales from solo freelancers to regulated enterprises. Start on Individual ($9/mo), grow into Team ($20/mo), upgrade to Pro
                        ($60/mo) for client work, or go Enterprise for on-prem deployment.
                    </p>
                    <p className="mt-3">Your agents migrate seamlessly. No rebuilding required.</p>
                </>
            ),
        },
        {
            id: 'item-4',
            icon: 'git-merge',
            question: '“How is this different from Zapier with AI?”',
            answer: (
                <>
                    <p>Zapier adds AI to automation. DruidX is purpose-built for AI agents.</p>
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-base">
                        <li>Supports every major AI model (Zapier integrates specific ones)</li>
                        <li>Chat-to-build interface vs. flowchart builder</li>
                        <li>Agent Council quality control (unique to DruidX)</li>
                        <li>Voice agents in 90+ languages</li>
                        <li>Pay-as-you-go pricing instead of rigid tiers</li>
                    </ul>
                </>
            ),
        },
        {
            id: 'item-5',
            icon: 'shield-check',
            question: '“What about data security?”',
            answer: (
                <>
                    <ul className="list-disc space-y-2 pl-5 text-base">
                        <li>Data encrypted in transit and at rest</li>
                        <li>SOC 2 compliance (in progress)</li>
                        <li>Optional on-prem deployment on Enterprise</li>
                        <li>We never train models on your data</li>
                    </ul>
                </>
            ),
        },
        {
            id: 'item-6',
            icon: 'credit-card',
            question: '“Can we try it without committing?”',
            answer: (
                <>
                    <p>
                        Yes. Start pay-as-you-go with $0 upfront. Build your first agent, see if it delivers value, add credits if it does, and only upgrade if
                        you want team features.
                    </p>
                    <p className="mt-3">No credit card required to start.</p>
                </>
            ),
        },
    ]

    return (
        <section className="bg-transparent py-20">
            <div className="mx-auto max-w-5xl px-4 md:px-6">
                <div className="flex flex-col gap-10 md:flex-row md:gap-16">
                    <div className="md:w-1/3">
                        <div className="sticky top-20">
                            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                                Frequently Asked Questions
                            </p>
                            <h2 className="mt-4 text-3xl font-bold">Questions Teams Ask Before Switching</h2>
                            <p className="text-muted-foreground mt-4">
                                Can&apos;t find what you&apos;re looking for? Contact our{' '}
                                <Link
                                    href="#"
                                    className="text-blue-500 font-medium hover:underline">
                                    customer support team
                                </Link>
                            </p>
                        </div>
                    </div>
                    <div className="md:w-2/3">
                        <Accordion
                            type="single"
                            collapsible
                            className="w-full space-y-2">
                            {faqItems.map((item) => (
                                <AccordionItem
                                    key={item.id}
                                    value={item.id}
                                    className="bg-white/5 backdrop-blur-sm shadow-xs rounded-lg border border-white/10 px-4 last:border-b">
                                    <AccordionTrigger className="cursor-pointer items-center py-5 hover:no-underline">
                                        <div className="flex items-center gap-3">
                                            <div className="flex size-6">
                                                <DynamicIcon
                                                    name={item.icon}
                                                    className="m-auto size-4"
                                                />
                                            </div>
                                            <span className="text-base">{item.question}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-5">
                                        <div className="px-9">
                                            <p className="text-base">{item.answer}</p>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                </div>
            </div>
        </section>
    )
}
