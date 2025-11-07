import { Suspense } from "react";
import { GptsList } from "./_components/gpts-list";
import { GptsLoading } from "./_components/gpts-loading";
import { GptsPageClient } from "./_components/gpts-page-client";

export default function GptsPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <GptsPageClient />
      <Suspense fallback={<GptsLoading />}>
        <GptsList />
      </Suspense>
    </div>
  );
}
