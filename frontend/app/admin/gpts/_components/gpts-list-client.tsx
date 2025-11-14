"use client";

import { useMemo } from "react";
import { GptCard } from "./gpt-card";
import { AdminGpt } from "@/data/get-admin-gpts";
import { useSearchContext } from "./gpts-list-wrapper";

interface GptsListClientProps {
  gpts: AdminGpt[];
}

export default function GptsListClient({ gpts }: GptsListClientProps) {
  const { searchTerm } = useSearchContext();

  const filteredGpts = useMemo(() => {
    if (!searchTerm.trim()) {
      return gpts;
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    return gpts.filter((gpt) =>
      gpt.name.toLowerCase().includes(searchLower)
    );
  }, [gpts, searchTerm]);

  if (!gpts || gpts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">No GPTs found</h3>
          <p className="text-gray-500 mt-2">
            Create your first GPT to get started.
          </p>
        </div>
      </div>
    );
  }

  if (filteredGpts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">No GPTs found</h3>
          <p className="text-gray-500 mt-2">
            No agents match your search &quot;{searchTerm}&quot;
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredGpts.map((gpt) => (
        <GptCard key={gpt.id} gpt={gpt} />
      ))}
    </div>
  );
}

