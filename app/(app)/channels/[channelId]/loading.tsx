import { ChatSurfaceSkeleton } from '@/components/ui/Skeleton'

export default function ChannelLoading() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <ChatSurfaceSkeleton />
    </div>
  )
}
