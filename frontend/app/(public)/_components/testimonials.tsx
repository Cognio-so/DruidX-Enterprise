import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'

type Testimonial = {
    name: string
    role: string
    image: string
    quote: string
}

const testimonials: Testimonial[] = [
    {
        name: 'Sarah Mitchell',
        role: 'Agency Owner',
        image: 'https://randomuser.me/api/portraits/women/1.jpg',
        quote: 'DruidX eliminated our AI subscription chaos. We went from paying $800/month for multiple tools to $200 with better results. The agents handle everything from client research to report generation.',
    },
    {
        name: 'Marcus Chen',
        role: 'Product Manager',
        image: 'https://randomuser.me/api/portraits/men/32.jpg',
        quote: 'Built our first agent in 8 minutes without writing code. It now handles all our Slack notifications and Google Sheets updates automatically. Game changer for our remote team.',
    },
    {
        name: 'Emily Rodriguez',
        role: 'Startup Founder',
        image: 'https://randomuser.me/api/portraits/women/44.jpg',
        quote: 'The pay-as-you-go model is perfect for startups. We only spend $50-100/month and get access to GPT-4, Claude, and Gemini. No more choosing between AI models.',
    },
    {
        name: 'David Thompson',
        role: 'Freelance Consultant',
        image: 'https://randomuser.me/api/portraits/men/22.jpg',
        quote: 'I was skeptical about AI agents, but DruidX made it incredibly simple. My research agent saves me 10+ hours weekly by automatically gathering and summarizing industry news.',
    },
    {
        name: 'Jessica Park',
        role: 'Marketing Director',
        image: 'https://randomuser.me/api/portraits/women/68.jpg',
        quote: 'DruidX transformed our content workflow. Our agents draft social posts, analyze campaign data, and even schedule meetings. The Notion integration alone is worth it.',
    },
    {
        name: 'Ryan Foster',
        role: 'Software Engineer',
        image: 'https://randomuser.me/api/portraits/men/54.jpg',
        quote: 'Finally, an AI platform that doesn\'t force you into rigid workflows. The flexibility to connect any tool and customize agents exactly how we need them is incredible.',
    },
    {
        name: 'Amanda Brooks',
        role: 'Operations Manager',
        image: 'https://randomuser.me/api/portraits/women/26.jpg',
        quote: 'We automated our entire client onboarding process with DruidX. What used to take 3 days now happens in hours, and our team can focus on high-value work.',
    },
    {
        name: 'Kevin Walsh',
        role: 'Creative Director',
        image: 'https://randomuser.me/api/portraits/men/71.jpg',
        quote: 'The voice agents in 90+ languages opened up international markets for us. DruidX handles client communications across time zones while we sleep.',
    },
    {
        name: 'Lisa Anderson',
        role: 'Data Analyst',
        image: 'https://randomuser.me/api/portraits/women/33.jpg',
        quote: 'DruidX agents pull data from multiple sources, analyze trends, and update our dashboards automatically. What used to be a full-time job now runs on autopilot.',
    },
    {
        name: 'Michael Torres',
        role: 'Business Development',
        image: 'https://randomuser.me/api/portraits/men/18.jpg',
        quote: 'The Gmail integration is phenomenal. Our agents draft personalized outreach emails, follow up automatically, and track responses. Our conversion rate doubled.',
    },
    {
        name: 'Rachel Kim',
        role: 'HR Manager',
        image: 'https://randomuser.me/api/portraits/women/52.jpg',
        quote: 'Recruiting became so much easier with DruidX. Agents screen resumes, schedule interviews via Calendar, and send follow-ups. We filled 5 positions in record time.',
    },
    {
        name: 'Christopher Lee',
        role: 'Financial Advisor',
        image: 'https://randomuser.me/api/portraits/men/63.jpg',
        quote: 'DruidX handles all our client reporting. Agents pull data from Google Sheets, generate insights, and email personalized reports. My clients love the consistency.',
    },
]

const chunkArray = (array: Testimonial[], chunkSize: number): Testimonial[][] => {
    const result: Testimonial[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
        result.push(array.slice(i, i + chunkSize))
    }
    return result
}

const testimonialChunks = chunkArray(testimonials, Math.ceil(testimonials.length / 3))

export default function WallOfLoveSection() {
    return (
        <section className="relative overflow-hidden bg-transparent py-24 md:py-32">
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_60%)]" />
                <div className="absolute inset-x-0 top-1/3 h-60 bg-gradient-to-r from-blue-500/15 via-transparent to-cyan-500/20 blur-3xl" />
            </div>

            <div className="mx-auto max-w-6xl px-6">
                <div className="text-center">
                    <span className="inline-flex items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-blue-200">
                        Testimonials
                    </span>
                    <h2 className="mt-6 text-balance text-3xl font-semibold leading-tight md:text-4xl">
                        Loved by the Community
                    </h2>
                    <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-sm leading-relaxed sm:text-base">
                        See what developers and teams are saying about their experience with DruidX.
                    </p>
                </div>
                <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {testimonialChunks.map((chunk, chunkIndex) => (
                        <div
                            key={chunkIndex}
                            className="space-y-4">
                            {chunk.map(({ name, role, quote, image }, index) => (
                                <Card 
                                    key={index}
                                    className="relative overflow-hidden border border-white/10 bg-gradient-to-b from-white/10 via-white/[0.02] to-transparent shadow-[0_18px_60px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-400/70 hover:shadow-[0_24px_80px_rgba(59,130,246,0.35)]"
                                >
                                    <div className="pointer-events-none absolute inset-px rounded-2xl border border-white/5 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_55%)] opacity-70 mix-blend-soft-light" />
                                    <CardContent className="relative grid grid-cols-[auto_1fr] gap-3 pt-6">
                                        <Avatar className="size-10 ring-2 ring-blue-500/20">
                                            <AvatarImage
                                                alt={name}
                                                src={image}
                                                loading="lazy"
                                                width="120"
                                                height="120"
                                            />
                                            <AvatarFallback className="bg-blue-500/10 text-blue-300">
                                                {name.split(' ').map(n => n[0]).join('')}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div>
                                            <h3 className="font-semibold text-white">{name}</h3>

                                            <span className="text-muted-foreground block text-xs tracking-wide">{role}</span>

                                            <blockquote className="mt-3">
                                                <p className="text-sm leading-relaxed text-white/80">{quote}</p>
                                            </blockquote>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
