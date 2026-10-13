"use client";

import { ArrowLeft, ArrowRight, Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import type { ProductImage } from "@/lib/api/types";
import { compressImage } from "@/lib/imageCompress";

export const MAX_PHOTOS = 8;

/**
 * Multi-photo uploader for a phone: take a photo or pick from the gallery, photos are compressed
 * in the browser, the first one is the cover, and the order can be changed.
 */
export function ImageUploader({
  value,
  onChange,
}: {
  value: ProductImage[];
  onChange: (images: ProductImage[]) => void;
}) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_PHOTOS - value.length;
    const picked = [...files].slice(0, room);
    const problems: string[] =
      files.length > room ? [`You can add up to ${MAX_PHOTOS} photos. Extra photos were skipped.`] : [];
    setBusy((n) => n + picked.length);
    const done: ProductImage[] = [];
    for (const f of picked) {
      try {
        done.push({ src: await compressImage(f), alt: "" });
      } catch (e) {
        problems.push(e instanceof Error ? e.message : "A photo could not be added.");
      } finally {
        setBusy((n) => n - 1);
      }
    }
    setErrors(problems);
    if (done.length) onChange([...value, ...done]);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };

  const full = value.length >= MAX_PHOTOS;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <Button type="button" size="lg" disabled={full} onClick={() => camera.current?.click()}>
          <Camera className="size-5" aria-hidden /> Take photo
        </Button>
        <Button
          type="button"
          size="lg"
          variant="secondary"
          disabled={full}
          onClick={() => gallery.current?.click()}
        >
          <ImagePlus className="size-5" aria-hidden /> Choose from gallery
        </Button>
        <input
          ref={camera}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-label="Take a photo"
          onChange={(e) => {
            void add(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={gallery}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose photos from gallery"
          data-testid="photo-input"
          onChange={(e) => {
            void add(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <p className="text-sm text-fg-muted">
        {value.length} of {MAX_PHOTOS} photos. The first photo is the cover. Photos are shrunk on your phone
        to save data.
      </p>

      {errors.length > 0 && (
        <ul role="alert" className="rounded-card bg-danger-soft p-3 text-sm text-danger">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      {(value.length > 0 || busy > 0) && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4" aria-label="Photos">
          {value.map((img, i) => (
            <li
              key={img.src.slice(-32) + i}
              className="flex flex-col gap-2 rounded-card bg-card p-2 shadow-card"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-btn bg-subtle">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt={`Photo ${i + 1}${i === 0 ? ", cover" : ""}`}
                  className="size-full object-cover"
                />
                {i === 0 && (
                  <span className="absolute top-2 left-2 rounded-pill bg-inverse px-2.5 py-1 text-xs font-medium text-fg-inverse">
                    Cover
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1">
                <IconButton
                  variant="ghost"
                  aria-label={`Move photo ${i + 1} earlier`}
                  disabled={i === 0}
                  icon={<ArrowLeft className="size-4" aria-hidden />}
                  onClick={() => move(i, -1)}
                />
                <IconButton
                  variant="ghost"
                  aria-label={`Move photo ${i + 1} later`}
                  disabled={i === value.length - 1}
                  icon={<ArrowRight className="size-4" aria-hidden />}
                  onClick={() => move(i, 1)}
                />
                <IconButton
                  variant="ghost"
                  aria-label={`Remove photo ${i + 1}`}
                  icon={<Trash2 className="size-4" aria-hidden />}
                  onClick={() => onChange(value.filter((_, k) => k !== i))}
                />
              </div>
            </li>
          ))}
          {Array.from({ length: busy }, (_, i) => (
            <li
              key={`busy-${i}`}
              role="status"
              aria-label="Adding photo"
              className="flex aspect-[4/5] items-center justify-center rounded-card bg-subtle"
            >
              <Loader2 className="size-6 animate-spin text-fg-secondary" aria-hidden />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
