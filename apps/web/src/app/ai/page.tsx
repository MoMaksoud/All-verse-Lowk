import dynamic from "next/dynamic";

const AssistantPage = dynamic(() => import("@/components/AssistantPage"), { ssr: false });

export default function Page() {
  return <AssistantPage />;
}