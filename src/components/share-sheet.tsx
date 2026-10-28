"use client";

import { useEffect, useState } from "react";
import { renderQuoteImage, SHARE_TONES, type ShareTone } from "@/lib/share-image";
import s from "./share-sheet.module.css";

type Props = {
  quote: { id: number; text: string; tags: string[] } | null;
  tone?: ShareTone;
  onClose: () => void;
  toast: (m: string) => void;
};

// Previews the story image, then shares it from a fresh tap: iOS only lets a
// page open the share sheet directly from a user's tap.
export function ShareSheet({ quote, tone: initialTone = "rose", onClose, toast }: Props) {
  const [tone, setTone] = useState<ShareTone>(initialTone);
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);

  useEffect(() => {
    if (!quote) return;
    let alive = true;
    let url = "";
    renderQuoteImage(quote, tone)
      .then((blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setImage({ blob, url });
      })
      .catch(() => toast("Couldn't make the image."));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
      setImage(null);
    };
  }, [quote, tone, toast]);

  useEffect(() => {
    if (!quote) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [quote, onClose]);

  if (!quote) return null;

  const file = image && new File([image.blob], `kotes-${quote.id}.png`, { type: "image/png" });
  const canShareFile = !!file && typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [file] });

  async function share() {
    if (!file) return;
    try {
      await navigator.share({ files: [file], text: `Found on kotes · ${location.origin}` });
      onClose();
    } catch (e) {
      if ((e as Error).name !== "AbortError") save();
    }
  }

  function save() {
    if (!image) return;
    const a = document.createElement("a");
    a.href = image.url;
    a.download = `kotes-${quote!.id}.png`;
    a.click();
    toast("Image saved");
  }

  return (
    <div className={s.backdrop} onClick={onClose} role="presentation">
      <div className={s.sheet} role="dialog" aria-modal aria-label="Share quote" onClick={(e) => e.stopPropagation()}>
        <span className={s.grip} aria-hidden />
        <div className={s.preview}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a local blob, not an optimisable asset */}
          {image ? <img src={image.url} alt="Preview of the image to share" /> : <span className="spinner" />}
        </div>

        <div className={s.tones} role="radiogroup" aria-label="Colour">
          {SHARE_TONES.map((t) => (
            <button
              key={t}
              role="radio"
              aria-checked={tone === t}
              aria-label={t}
              className={s.swatch}
              data-tone={t}
              onClick={() => setTone(t)}
            />
          ))}
        </div>

        <div className={s.actions}>
          {canShareFile ? (
            <button className="btn block" onClick={share} disabled={!image}>
              Share to stories &amp; chats
            </button>
          ) : (
            <button className="btn block" onClick={save} disabled={!image}>
              Save image
            </button>
          )}
          <div className={s.row}>
            {canShareFile && (
              <button className={s.link} onClick={save} disabled={!image}>
                Save image
              </button>
            )}
            <button className={s.link} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
