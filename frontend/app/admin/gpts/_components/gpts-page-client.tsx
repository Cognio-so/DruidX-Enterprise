"use client";

import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Sparkles, Search } from "lucide-react";
import Link from "next/link";
import { AutoBuilderDialog } from "./auto-builder-dialog";
import { useSearchContext } from "./gpts-list-wrapper";

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
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary">
            GPT Collection
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage and organize your custom GPTs
          </p>
        </div>
        <div className="flex-shrink-0 flex gap-2">
          <Button
            onClick={() => setAutoBuildOpen(true)}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Auto-Build Agents</span>
            <span className="sm:hidden">Auto-Build</span>
          </Button>
          <Link
            href="/admin/gpts/create-gpt"
            className={buttonVariants({
              className: "w-full sm:w-auto",
            })}
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Create New GPT</span>
            <span className="sm:hidden">Create GPT</span>
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

