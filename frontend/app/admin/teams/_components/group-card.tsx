"use client";

import { TeamGroup } from "@/data/get-team-groups";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Eye, Sparkles } from "lucide-react";
import Image from "next/image";

interface GroupCardProps {
  group: TeamGroup;
  onPreview: (groupId: string) => void;
}

export default function GroupCard({ group, onPreview }: GroupCardProps) {
  const memberCount = group._count.members;
  const gptCount = group._count.gptAssignments;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border">
            {group.image ? (
              <Image
                src={group.image}
                alt={group.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                <Users className="h-8 w-8 text-primary" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg line-clamp-1">{group.name}</CardTitle>
            {group.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {group.description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{memberCount}</span>
            <span className="text-muted-foreground">
              {memberCount === 1 ? "member" : "members"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{gptCount}</span>
            <span className="text-muted-foreground">
              {gptCount === 1 ? "GPT" : "GPTs"}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => onPreview(group.id)}
        >
          <Eye className="h-4 w-4" />
          Preview
        </Button>
      </CardFooter>
    </Card>
  );
}

