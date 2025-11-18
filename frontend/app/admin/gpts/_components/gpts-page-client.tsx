"use client";

import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Search } from "lucide-react";
import Link from "next/link";
import { AutoBuilderDialog } from "./auto-builder-dialog";
import { useSearchContext } from "./gpts-list-wrapper";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { BsStars } from "react-icons/bs";

export function GptsPageClient() {
  const [autoBuildOpen, setAutoBuildOpen] = useState(false);
  const { searchTerm, setSearchTerm } = useSearchContext();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="h-9 w-9 md:hidden" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary">
              GPT Collection
            </h1>
          </div>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage and organize your custom GPTs
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:items-center">
          <Button
            onClick={() => setAutoBuildOpen(true)}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Sparkles className="w-4 h-4 mr-2 text-primary" />
            <span className="hidden sm:inline">Auto-Build Agents</span>
            <span className="sm:hidden">Auto-Build</span>
          </Button>
          <Link
            href="/admin/gpts/create-gpt"
            className={buttonVariants({
              className: "w-full sm:w-auto",
            })}
          >
            <BsStars className="size-4 mr-2" />
            <span className="hidden sm:inline">Create Agent</span>
            <span className="sm:hidden">Create Agent</span>
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search agents by name..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>
      </div>

      <AutoBuilderDialog
        open={autoBuildOpen}
        onOpenChange={setAutoBuildOpen}
      />
    </>
  );
}

