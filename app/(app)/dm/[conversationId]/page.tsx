import dynamic from 'next/dynamic'
import { ChatSurfaceSkeleton } from '@/components/ui/Skeleton'

const DMConversationView = dynamic(
  () => import('@/components/dm/DMConversationView'),
  {
    ssr: false,
    loading: () => <ChatSurfaceSkeleton variant="dm" />,
  }
)

export default function DMPage({
  params,
}: {
  params: { conversationId: string }
}) {
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <DMConversationView conversationId={params.conversationId} />
    </div>
  )
}
