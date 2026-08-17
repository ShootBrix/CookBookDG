import { useRef, useState, type CSSProperties, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { RecipeImage, RecipePage } from '../../types'
import {
  MAX_IMAGES_PER_PAGE,
  type AddImageFailureReason,
} from '../../store/CookbookStore'
import {
  processImageFile,
  type ProcessImageErrorCode,
} from '../../imageProcessing'
import { BRASS, INK_MUTED } from './RecipeGridFields'
import { RecipeImageLightbox } from './RecipeImageLightbox'
import type { PageImageActions } from './imageActions'

const ROTATIONS = ['-1.5deg', '1deg']

function processErrorKey(code: ProcessImageErrorCode): string {
  if (code === 'invalid-type') return 'errorInvalidType'
  if (code === 'decode-failed') return 'errorDecodeFailed'
  return 'errorTooLarge'
}

function addErrorKey(reason: AddImageFailureReason): string {
  if (reason === 'limit-reached') return 'errorLimitReached'
  if (reason === 'quota-exceeded') return 'errorQuotaExceeded'
  return 'errorNotFound'
}

type RecipeImageCardProps = {
  image: RecipeImage
  index: number
  wide: boolean
  font: string
  t: TFunction
  altFallback: string
  onOpenLightbox: (image: RecipeImage, trigger: HTMLElement) => void
  onDelete: () => void
  onCaptionChange: (caption: string) => void
}

function RecipeImageCard({
  image,
  index,
  wide,
  font,
  t,
  altFallback,
  onOpenLightbox,
  onDelete,
  onCaptionChange,
}: RecipeImageCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const alt = image.caption.trim() || altFallback

  return (
    <figure
      className={`group relative flex flex-col items-center gap-2 ${wide ? 'w-full sm:w-1/2' : 'w-full sm:max-w-[45%] sm:flex-1'}`}
    >
      <div
        className="recipe-photo-frame relative"
        style={
          {
            '--photo-rotation': ROTATIONS[index % ROTATIONS.length],
          } as CSSProperties
        }
      >
        <button
          type="button"
          onClick={(e) => onOpenLightbox(image, e.currentTarget)}
          aria-label={t('book.grid.images.openLightbox')}
          className="block w-full cursor-zoom-in rounded-[2px] p-[6px]"
          style={{
            background: '#FFFFFF',
            border: `1px solid ${BRASS}`,
            boxShadow: '0 6px 14px rgba(0,0,0,0.35)',
          }}
        >
          <img
            src={image.url}
            alt={alt}
            className="block h-auto w-full rounded-[1px]"
          />
        </button>

        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            aria-label={t('book.grid.images.deleteLabel')}
            className="absolute top-1 end-1 flex h-6 w-6 items-center justify-center rounded-full text-sm opacity-0 transition-opacity duration-150 hover:bg-black/20 focus-visible:opacity-100 group-hover:opacity-100"
            style={{ color: '#F1E3BF', background: 'rgba(0,0,0,0.45)' }}
          >
            ×
          </button>
        ) : (
          <div
            className="absolute top-1 end-1 flex items-center gap-1.5 rounded px-2 py-1 text-[10px]"
            style={{ background: 'rgba(0,0,0,0.75)', color: '#F1E3BF' }}
          >
            <span>{t('book.grid.images.removeConfirmPrompt')}</span>
            <button
              type="button"
              onClick={onDelete}
              className="font-semibold underline"
            >
              {t('book.grid.images.removeConfirmYes')}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="underline"
            >
              {t('book.grid.images.removeConfirmNo')}
            </button>
          </div>
        )}
      </div>

      <input
        value={image.caption}
        onChange={(e) => onCaptionChange(e.target.value)}
        placeholder={t('book.grid.images.captionPlaceholder')}
        className="w-full bg-transparent text-center text-xs italic outline-none"
        style={{ color: INK_MUTED, fontFamily: font }}
      />
    </figure>
  )
}

type RecipeImagesProps = {
  page: RecipePage
  imageActions: PageImageActions
  font: string
}

export function RecipeImages({ page, imageActions, font }: RecipeImagesProps) {
  const { t } = useTranslation()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [lightbox, setLightbox] = useState<{
    image: RecipeImage
    trigger: HTMLElement
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const remaining = MAX_IMAGES_PER_PAGE - page.images.length

  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList)
    if (files.length === 0) return

    const toProcess = files.slice(0, remaining)
    const skipped = files.length - toProcess.length
    const messages: string[] = []

    setProcessing(true)
    try {
      for (const file of toProcess) {
        const result = await processImageFile(file)
        if (!result.ok) {
          messages.push(t(`book.grid.images.${processErrorKey(result.code)}`))
          continue
        }
        const added = imageActions.addImage({ ...result.image, caption: '' })
        if (!added.ok) {
          messages.push(t(`book.grid.images.${addErrorKey(added.reason)}`))
        }
      }
    } finally {
      setProcessing(false)
    }

    if (skipped > 0) {
      messages.push(t('book.grid.images.skipped', { count: skipped }))
    }
    setError(messages.length > 0 ? messages.join(' ') : null)
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (remaining > 0) setDragActive(true)
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
    setDragActive(false)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragActive(false)
    if (remaining <= 0) return
    void handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="my-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex flex-col items-center gap-4 rounded-lg p-2 transition-colors sm:flex-row sm:items-start sm:justify-center"
        style={
          dragActive
            ? {
                outline: `2px dashed ${BRASS}`,
                outlineOffset: '-2px',
                background: 'rgba(201,162,74,0.12)',
              }
            : undefined
        }
      >
        {page.images.map((image, index) => (
          <RecipeImageCard
            key={image.id}
            image={image}
            index={index}
            wide={page.images.length === 1}
            font={font}
            t={t}
            altFallback={page.title}
            onOpenLightbox={(img, trigger) =>
              setLightbox({ image: img, trigger })
            }
            onDelete={() => imageActions.removeImage(image.id)}
            onCaptionChange={(caption) =>
              imageActions.updateCaption(image.id, caption)
            }
          />
        ))}

        {remaining > 0 &&
          (processing ? (
            <div
              className="flex flex-col items-center gap-2 text-xs italic"
              style={{ color: INK_MUTED, fontFamily: font }}
            >
              <span
                className="h-5 w-5 animate-spin rounded-full border-2 border-current"
                style={{ borderTopColor: 'transparent' }}
              />
              {t('book.grid.images.processing')}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs italic"
                style={{ color: 'rgba(59,46,31,0.6)', fontFamily: font }}
              >
                {t('book.grid.images.addButton')}
              </button>
              <span
                className="text-[10px] italic"
                style={{ color: INK_MUTED, fontFamily: font }}
              >
                {t('book.grid.images.dropHint')}
              </span>
            </div>
          ))}

        {remaining <= 0 && (
          <span
            className="text-xs italic"
            style={{ color: INK_MUTED, fontFamily: font }}
          >
            {t('book.grid.images.limit')}
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void handleFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {error && (
        <p
          role="alert"
          className="mt-2 text-center text-xs"
          style={{ color: '#7A2E2A', fontFamily: font }}
        >
          {error}
        </p>
      )}

      {lightbox && (
        <RecipeImageLightbox
          image={lightbox.image}
          alt={lightbox.image.caption.trim() || page.title}
          closeLabel={t('book.grid.images.lightboxClose')}
          onClose={() => setLightbox(null)}
          triggerRef={{ current: lightbox.trigger }}
        />
      )}
    </div>
  )
}
