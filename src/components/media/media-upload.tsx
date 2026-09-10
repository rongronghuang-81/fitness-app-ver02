'use client'

import * as React from 'react'
import { Camera, Upload, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { prepareUpload, recordMedia } from '@/actions/media'
import { MEDIA_BUCKET } from '@/lib/media-constants'
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from '@/lib/validation/schemas'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { useToast } from '@/components/ui/toast'
import { formatFileSize, studentName } from '@/lib/domain/format'

interface Pickable {
  id: string
  first_name: string
  last_name: string | null
  preferred_name: string | null
}

/**
 * Mobile-first media upload (§29).
 *
 * Four taps: choose the student, choose the trick, take or pick the file, save.
 * A photo thumbnail is generated client-side so the gallery never has to fetch
 * full-size originals just to render a grid.
 */
export function MediaUpload({
  students,
  tricks,
  classId,
  defaultStudentId,
  defaultTrickId,
  trigger,
}: {
  students: Pickable[]
  tricks: { id: string; name: string }[]
  classId?: string
  defaultStudentId?: string
  defaultTrickId?: string
  trigger?: React.ReactNode
}) {
  const { notify } = useToast()
  const [open, setOpen] = React.useState(false)
  const [file, setFile] = React.useState<File | null>(null)
  const [studentId, setStudentId] = React.useState(defaultStudentId ?? '')
  const [trickId, setTrickId] = React.useState(defaultTrickId ?? '')
  const [caption, setCaption] = React.useState('')
  const [progress, setProgress] = React.useState<number | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const cameraRef = React.useRef<HTMLInputElement>(null)
  const libraryRef = React.useRef<HTMLInputElement>(null)

  function reset() {
    setFile(null)
    setCaption('')
    setProgress(null)
    setError(null)
    setStudentId(defaultStudentId ?? '')
    setTrickId(defaultTrickId ?? '')
  }

  function pick(selected: File | undefined) {
    if (!selected) return
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(selected.type)) {
      setError(`${selected.type || 'That file type'} is not supported. Use a photo or a video.`)
      return
    }
    if (selected.size > MAX_UPLOAD_BYTES) {
      setError(`That file is ${formatFileSize(selected.size)}. The limit is 500 MB.`)
      return
    }
    setError(null)
    setFile(selected)
  }

  async function upload() {
    if (!file) return
    setError(null)
    setProgress(1)

    const prepared = await prepareUpload({
      studentId: studentId || null,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
    })

    if (prepared.status === 'error' || !prepared.path) {
      setError(prepared.status === 'error' ? prepared.message : 'Could not start the upload.')
      setProgress(null)
      return
    }

    const supabase = createClient()
    setProgress(35)

    const { error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(prepared.path, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      setError(`Upload failed: ${uploadError.message}`)
      setProgress(null)
      return
    }

    setProgress(70)

    const isPhoto = file.type.startsWith('image/')
    let thumbnailPath: string | null = null

    if (isPhoto) {
      const thumb = await makeThumbnail(file).catch(() => null)
      if (thumb) {
        const thumbPath = prepared.path.replace(/(\.[^.]+)$/, '-thumb.jpg')
        const { error: thumbError } = await supabase.storage
          .from(MEDIA_BUCKET)
          .upload(thumbPath, thumb, { contentType: 'image/jpeg', upsert: true })
        // A missing thumbnail is cosmetic — never fail the upload over it.
        if (!thumbError) thumbnailPath = thumbPath
      }
    }

    setProgress(90)

    const result = await recordMedia({
      storage_path: prepared.path,
      thumbnail_path: thumbnailPath,
      file_type: isPhoto ? 'photo' : 'video',
      mime_type: file.type,
      file_size: file.size,
      student_id: studentId || null,
      class_id: classId ?? null,
      trick_id: trickId || null,
      caption: caption.trim() || null,
    })

    setProgress(100)

    if (result.status === 'error') {
      setError(result.message)
      setProgress(null)
      return
    }

    notify(result.status === 'success' ? (result.message ?? 'Uploaded.') : 'Uploaded.')
    setOpen(false)
    reset()
  }

  const canSave = file !== null && (studentId || classId || trickId)

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          <Camera className="size-4" />
          Add media
        </Button>
      )}

      <Sheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) reset()
        }}
        title="Add photo or video"
        description="Stored privately. Only you can view it."
        footer={
          <>
            <Button
              variant="secondary"
              className="flex-1 justify-center"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 justify-center"
              disabled={!canSave || progress !== null}
              loading={progress !== null}
              onClick={upload}
            >
              {progress !== null ? `Uploading… ${progress}%` : 'Save'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* `capture` opens the camera directly on a phone. */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <input
            ref={libraryRef}
            type="file"
            accept="image/*,video/*"
            className="sr-only"
            onChange={(e) => pick(e.target.files?.[0])}
          />

          {file ? (
            <div className="flex items-center gap-3 rounded-xl bg-[var(--surface-muted)] p-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{file.name}</span>
                <span className="block text-xs text-muted">{formatFileSize(file.size)}</span>
              </span>
              <button
                type="button"
                onClick={() => setFile(null)}
                aria-label="Remove file"
                className="tap flex items-center justify-center rounded-lg text-[var(--text-muted)]"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                className="h-20 flex-col justify-center"
                onClick={() => cameraRef.current?.click()}
              >
                <Camera className="size-5" />
                Take photo / video
              </Button>
              <Button
                variant="secondary"
                className="h-20 flex-col justify-center"
                onClick={() => libraryRef.current?.click()}
              >
                <Upload className="size-5" />
                Choose from phone
              </Button>
            </div>
          )}

          <Field label="Student" htmlFor="media-student">
            <Select
              id="media-student"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              <option value="">Not linked to a student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {studentName(s)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Trick" htmlFor="media-trick">
            <Select id="media-trick" value={trickId} onChange={(e) => setTrickId(e.target.value)}>
              <option value="">Not linked to a trick</option>
              {tricks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Caption" htmlFor="media-caption">
            <Input
              id="media-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="First clean entry"
            />
          </Field>

          {progress !== null ? (
            <div>
              <div
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Upload progress"
                className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]"
              >
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}

          {error ? <FormError>{error}</FormError> : null}

          {!canSave && file ? (
            <p className="text-xs text-muted">
              Link the media to a student, class or trick before saving.
            </p>
          ) : null}
        </div>
      </Sheet>
    </>
  )
}

/**
 * Downscales a photo to a 400px JPEG for the gallery grid.
 * Runs entirely in the browser — no server-side image pipeline in V1.
 */
async function makeThumbnail(file: File, maxSize = 400): Promise<Blob | null> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return null
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8))
}
