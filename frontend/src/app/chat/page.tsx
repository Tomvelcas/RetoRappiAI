import { ChatWorkspace } from "@/components/chat-workspace";

type ChatPageProps = {
  searchParams?: Promise<{
    question?: string;
  }>;
};

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const resolvedSearchParams = await searchParams;

  return <ChatWorkspace initialQuestion={resolvedSearchParams?.question ?? null} />;
}
