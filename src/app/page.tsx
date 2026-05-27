import { redirect } from "next/navigation";
import { getActiveWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function Home() {
  const workspace = await getActiveWorkspace();
  redirect(workspace ? "/dashboard" : "/setup");
}
