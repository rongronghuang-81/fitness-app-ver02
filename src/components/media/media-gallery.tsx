'use client'

import * as React from 'react'
import { Film, ImageIcon, Trash2 } from 'lucide-react'
import { getSignedMediaUrls, deleteMedia } from '@/actions/media'
import { Sheet, ConfirmDialog } from '@/components/ui/sheet'
import { Input, Select } from '@/components/ui/field'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { formatDateShort } from '@/lib/domain/format'
import { toToast } from '@/lib/action-result'

export interface GalleryItem {
  id: string
  file_type: 'photo' | 'video'
  caption: string | null
  created_at: string
  class_id: string | null
  trick_id: string | null
  tricks: { id: string; name: string } | null
  /** Present when the gallery spans several classes, so they can be told apart. */
  classes?: { id: string; scheduled_date: string } | null
}

/**
 * Private media gallery (§8, §28).
 *
 * Thumbnails are fetched as short-lived signed URLs and only for the items
 * currently visible — the bucket is private, so there is no public URL to leak,
 * and nothing is loaded until this tab is actually opened (§49).
 */
export function MediaGallery({ items }: { items: GalleryItem[] }) {
  const { notify } = useToast()
  const [urls, setUrls] = React.useState<Record<string, { url: string; thumbnailUrl: string | null }>>({})
  const [loading, setLoading] = React.useState(items.length > 0)
  const [active, setActive] = React.useState<GalleryItem | null>(null)
  const [confirmDelete, setConfirmDelete] = React.useState<GalleryItem | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const [typeFilter, setTypeFilter] = React.useState<'all' | 'photo' | 'video'>('all')
  const [trickFilter, setTrickFilter] = React.useState('')
  const [classFilter, setClassFilter] = React.useState('')
  const [from, setFrom] = React.useState('')
  const [to, setTo] = React.useState('')

  const tricks = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const item of items) if (item.tricks) map.set(item.tricks.id, item.tricks.name)
    return [...map.entries()]
  }, [items])

  const classes = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const item of items) {
      if (item.classes) map.set(item.classes.id, formatDateShort(item.classes.scheduled_date))
    }
    return [...map.entries()]
  }, [items])

  const filtered = React.useMemo(
    () =>
      items.filter((item) => {
        if (typeFilter !== 'all' && item.file_type !== typeFilter) return false
        if (trickFilter && item.trick_id !== trickFilter) return false
        if (classFilter && item.class_id !== classFilter) return false
        // created_at is a timestamp; compare on the date part only.
        const day = item.created_at.slice(0, 10)
        if (from && day < from) return false
        if (to && day > to) return false
        return true
      }),
    [items, typeFilter, trickFilter, classFilter, from, to],
  )

  const hasFilters = Boolean(typeFilter !== 'all' || trickFilter || classFilter || from || to)

  React.useEffect(() => {
    // `loading` already initialises to false when there is nothing to fetch,
    // so there is no synchronous state update to make here.
    if (items.length === 0) return

    let cancelled = false
    getSignedMediaUrls(items.map((i) => i.id))
      .then((result) => {
        if (!cancelled) setUrls(result)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [items])

  async function onDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    const result = await deleteMedia(confirmDelete.id)
    setDeleting(false)
    setConfirmDelete(null)
    const toast = toToast(result, 'Deleted.')
    if (toast) notify(toast.message, toast.tone)
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="No media yet"
        description="Photos and videos you upload during a class will appear here."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          aria-label="Filter by media type"
        >
          <option value="all">All media</option>
          <option value="photo">Photos</option>
          <option value="video">Videos</option>
        </Select>

        {tricks.length > 0 ? (
          <Select
            value={trickFilter}
            onChange={(e) => setTrickFilter(e.target.value)}
            aria-label="Filter by trick"
          >
            <option value="">All tricks</option>
            {tricks.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
        ) : null}

        {classes.length > 1 ? (
          <Select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            aria-label="Filter by class"
          >
            <option value="">All classes</option>
            {classes.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </Select>
        ) : null}

        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
      </div>

      {loading ? (
        <p className="flex items-center gap-2 py-6 text-sm text-muted">
          <Spinner /> Loading media…
        </p>
      ) : filtered.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-muted">Nothing matches those filters.</p>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => {
                setTypeFilter('all')
                setTrickFilter('')
                setClassFilter('')
                setFrom('')
                setTo('')
              }}
              className="mt-2 text-sm font-medium text-[var(--accent)] hover:underline"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {filtered.map((item) => {
            const signed = urls[item.id]
            const preview = signed?.thumbnailUrl ?? (item.file_type === 'photo' ? signed?.url : null)
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setActive(item)}
                  className="group relative block aspect-square w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]"
                >
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element -- signed URLs expire, so the optimizer cache would serve stale 403s
                    <img
                      src={preview}
                      alt={item.caption ?? `${item.file_type} from ${formatDateShort(item.created_at)}`}
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center">
                      {item.file_type === 'video' ? (
                        <Film className="size-6 text-[var(--text-subtle)]" />
                      ) : (
                        <ImageIcon className="size-6 text-[var(--text-subtle)]" />
                      )}
                    </span>
                  )}
                  {item.file_type === 'video' ? (
                    <span className="absolute bottom-1 right-1 rounded bg-black/60 p-1">
                      <Film className="size-3 text-white" aria-hidden="true" />
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <Sheet
        open={active !== null}
        onOpenChange={(open) => !open && setActive(null)}
        title={active?.caption || (active?.file_type === 'video' ? 'Video' : 'Photo')}
        description={active ? formatDateShort(active.created_at) : undefined}
        className="sm:max-w-2xl"
        footer={
          active ? (
            <button
              type="button"
              onClick={() => {
                const item = active
                setActive(null)
                setConfirmDelete(item)
              }}
              className="tap flex items-center gap-2 rounded-xl px-3 text-sm font-medium text-[var(--negative)]"
            >
              <Trash2 className="size-4" />
              Delete
            </button>
          ) : undefined
        }
      >
        {active && urls[active.id] ? (
          active.file_type === 'video' ? (
            <video
              src={urls[active.id]!.url}
              controls
              playsInline
              preload="metadata"
              className="max-h-[65dvh] w-full rounded-xl bg-black"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- signed URLs expire
            <img
              src={urls[active.id]!.url}
              alt={active.caption ?? 'Student media'}
              className="max-h-[65dvh] w-full rounded-xl object-contain"
            />
          )
        ) : (
          <p className="py-8 text-center text-sm text-muted">Preparing media…</p>
        )}
        {active?.tricks ? (
          <p className="mt-3 text-sm text-muted">Trick: {active.tricks.name}</p>
        ) : null}
      </Sheet>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Delete this media?"
        description="The file and its record are removed permanently. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={onDelete}
        pending={deleting}
      />
    </div>
  )
}
