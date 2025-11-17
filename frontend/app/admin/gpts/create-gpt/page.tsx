import { CreateGptForm } from "./_components/create-gpt-form";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { getKnowledgeBases } from "@/data/get-knowledge-base";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default async function Gpt() {
  const knowledgeBases = await getKnowledgeBases();

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4 justify-between">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="h-9 w-9 md:hidden" />
            <h1 className="text-3xl font-bold">Create Custom GPT</h1>
          </div>
          <Link
            href="/admin/gpts"
            className={buttonVariants({ variant: "outline" })}
          >
            <ArrowLeftIcon className="size-4 mr-2" />
            Back
          </Link>
        </div>
      </div>

      <CreateGptForm knowledgeBases={knowledgeBases} />
    </div>
  );
}
