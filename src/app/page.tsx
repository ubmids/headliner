import Headliner from "@/components/Headliner";
import { serverMode } from "@/lib/server";

export const dynamic = "force-dynamic";

export default function Page() {
  return <Headliner mode={serverMode()} />;
}
