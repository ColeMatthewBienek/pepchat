'use client'

import CreateGroupModal from './CreateGroupModal'

interface JoinGroupModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function JoinGroupModal({ open, onClose, onSuccess }: JoinGroupModalProps) {
  return <CreateGroupModal open={open} onClose={onClose} onSuccess={onSuccess} initialTab="join" />
}
