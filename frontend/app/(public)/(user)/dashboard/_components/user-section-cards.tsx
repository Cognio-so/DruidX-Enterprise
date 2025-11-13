import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  MessageCircle, 
  MessageSquare, 
  TrendingUp, 
  Star,
  BarChart3
} from "lucide-react";
import { UserDashboardMetrics } from "@/data/get-user-dashboard-ssr";

interface SectionCardsProps {
  metrics: UserDashboardMetrics;
}

export function UserSectionCards({ metrics }: SectionCardsProps) {
  const cards = [
    {
      title: "Assigned GPTs",
      value: metrics.totalAssignedGpts,
      description: "GPTs available to you",
      icon: Bot,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Total Conversations",
      value: metrics.totalConversations,
      description: "All your conversations",
      icon: MessageCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Total Messages",
      value: metrics.totalMessages,
      description: "Messages sent and received",
      icon: MessageSquare,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Recent Conversations",
      value: metrics.recentConversations,
      description: "Last 7 days",
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Most Used GPT",
      value: metrics.mostUsedGpt || "None",
      description: "Your favorite GPT",
      icon: Star,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      title: "Avg Messages/Conversation",
      value: metrics.averageMessagesPerConversation,
      description: "Average conversation length",
      icon: BarChart3,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
              {card.title === "Recent Conversations" && metrics.conversationGrowth > 0 && (
                <div className="flex items-center mt-2">
                  <Badge variant="secondary" className="text-xs">
                    +{metrics.conversationGrowth.toFixed(1)}% this month
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
