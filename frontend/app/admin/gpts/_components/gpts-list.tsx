import { getAdminGpts } from "@/data/get-admin-gpts";
import GptsListClient from "./gpts-list-client";

export async function GptsList() {
  const gpts = await getAdminGpts();

  return <GptsListClient gpts={gpts} />;
}
