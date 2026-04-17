'use client'

import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Attachment } from '@/lib/types'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_SIZE = 8 * 1024 * 1024
const MAX_COUNT = 4

type UploadState = 'uploading' | 'done' | 'error'

export interface PendingImage {
  id: string
  file: File
  localUrl: string
  state: UploadState
  attachment?: Attachment
  error?: string
}

export function useImageUpload() {
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  const [inputError, setInputError] = useState('')
  const pendingRef = useRef<PendingImage[]>([])

  const updatePending = useCallback((updater: (prev: PendingImage[]) => PendingImage[]) => {
    setPendingImages(prev => {
      const next = updater(prev)
      pendingRef.current = next
      return next
    })
  }, [])

  function getImageDimensions(file: File): Promise<{ width?: number; height?: number }> {
    return new Promise(resolve => {
      const url = URL.createObjectURL(file)
      const img = new window.Image()
      img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }) }
      img.onerror = () => { URL.revokeObjectURL(url); resolve({}) }
      img.src = url
    })
  }

  const startUpload = useCallback(async (id: string, file: File, userId: string) => {
    const supabase = createClient()
    try {
      const path = `${userId}/${crypto.randomUUID()}-${file.name}`
      const { data, error } = await supabase.storage
        .from('chat-images')
        .upload(path, file, { upsert: false })
      if (error) throw new Error(error.message)

      const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(data.path)
      const dims = await getImageDimensions(file)

      const attachment: Attachment = {
        url: urlData.publicUrl,
        type: 'image',
        name: file.name,
        size: file.size,
        ...dims,
      }
      updatePending(prev => prev.map(p => p.id === id ? { ...p, state: 'done', attachment } : p))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      updatePending(prev => prev.map(p => p.id === id ? { ...p, state: 'error', error: message } : p))
    }
  }, [updatePending])

  const addFiles = useCallback((files: FileList | File[], userId: string) => {
    setInputError('')
    const fileArr = Array.from(files)

    if (fileArr.some(f => !ACCEPTED_TYPES.includes(f.type))) {
      setInputError('Only JPEG, PNG, GIF, and WebP are supported')
      return
    }
    if (fileArr.some(f => f.size > MAX_SIZE)) {
      setInputError('Image must be under 8MB')
      return
    }
    if (pendingRef.current.length + fileArr.length > MAX_COUNT) {
      setInputError('Maximum 4 images per message')
      return
    }

    const newImages: PendingImage[] = fileArr.map(file => ({
      id: crypto.randomUUID(),
      file,
      localUrl: URL.createObjectURL(file),
      state: 'uploading' as const,
    }))

    updatePending(prev => [...prev, ...newImages])
    newImages.forEach(img => startUpload(img.id, img.file, userId))
  }, [startUpload, updatePending])

  const removeImage = useCallback((id: string) => {
    updatePending(prev => {
      const img = prev.find(p => p.id === id)
      if (img) URL.revokeObjectURL(img.localUrl)
      return prev.filter(p => p.id !== id)
    })
    setInputError('')
  }, [updatePending])

  const retryUpload = useCallback((id: string, userId: string) => {
    const img = pendingRef.current.find(p => p.id === id)
    if (!img) return
    updatePending(prev => prev.map(p => p.id === id ? { ...p, state: 'uploading', error: undefined } : p))
    startUpload(id, img.file, userId)
  }, [startUpload, updatePending])

  const clearAll = useCallback(() => {
    updatePending(prev => { prev.forEach(p => URL.revokeObjectURL(p.localUrl)); return [] })
    setInputError('')
  }, [updatePending])

  const hasUploading = pendingImages.some(p => p.state === 'uploading')
  const attachments: Attachment[] = pendingImages
    .filter(p => p.state === 'done' && p.attachment)
    .map(p => p.attachment!)

  return { pendingImages, inputError, addFiles, removeImage, retryUpload, clearAll, hasUploading, attachments }
}
