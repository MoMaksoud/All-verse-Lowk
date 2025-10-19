'use client';

import React, { useState, useCallback } from 'react';

type Props = {
  uid: string;
  listingId: string;
  urls: string[];
  onChangeUrls: (urls: string[]) => void;
  onBusyChange?: (busy: boolean) => void;
};

export default function ListingGalleryEditor(props: Props) {
  const { urls, onChangeUrls } = props;
  const [activeIndex, setActiveIndex] = useState(0);

  const setUrlsAndEmit = useCallback((newUrls: string[]) => {
    onChangeUrls(newUrls);
  }, [onChangeUrls]);

  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    e.dataTransfer.setData("text/plain", String(idx));
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, to: number) => {
    e.preventDefault();
    const from = Number(e.dataTransfer.getData("text/plain"));
    if (Number.isNaN(from) || from === to) return;
    const arr = urls.slice();
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    setUrlsAndEmit(arr);
    setActiveIndex(to);
  }, [urls, setUrlsAndEmit]);

  const setAsCover = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    if (activeIndex <= 0) return;
    const arr = urls.slice();
    const [moved] = arr.splice(activeIndex, 1);
    arr.unshift(moved);
    setUrlsAndEmit(arr);
    setActiveIndex(0);
  }, [urls, activeIndex, setUrlsAndEmit]);

  const removePhoto = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    if (urls.length <= 1) return;
    const arr = urls.slice();
    arr.splice(activeIndex, 1);
    setUrlsAndEmit(arr);
    setActiveIndex(Math.max(0, activeIndex - 1));
  }, [urls, activeIndex, setUrlsAndEmit]);

  if (urls.length === 0) {
    return (
      <section className="rounded-2xl bg-[#1b2230] border border-white/5">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-semibold px-2">
                0
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-white">Photos</h2>
            <span className="text-sm text-white/60">0 photos</span>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <div className="text-center py-8 text-white/50">
            No photos to edit
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-[#1b2230] border border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-semibold px-2">
              {urls.length}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-white">Photos</h2>
          <span className="text-sm text-white/60">{urls.length} {urls.length === 1 ? "photo" : "photos"}</span>
        </div>
        <span className="hidden sm:block text-xs text-white/40 select-none">Drag to reorder</span>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-6 space-y-4">
        {/* Main preview */}
        <div className="aspect-[16/10] w-full rounded-xl bg-black/30 ring-1 ring-white/5 overflow-hidden flex items-center justify-center">
          {urls[activeIndex] ? (
            <img
              src={urls[activeIndex]}
              alt=""
              className="h-full w-full object-contain"
              draggable={false}
            />
          ) : (
            <div className="text-white/50">No image</div>
          )}
        </div>

        {/* Thumbnails strip */}
        <div aria-label="Reorder photos" className="flex gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pb-1">
          {urls.map((u, idx) => (
            <button
              key={u + idx}
              type="button"
              title={`Photo ${idx + 1}`}
              onClick={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                setActiveIndex(idx); 
              }}
              className={[
                "relative shrink-0 h-20 w-28 rounded-lg overflow-hidden ring-1 ring-white/10",
                idx === activeIndex ? "outline outline-2 outline-blue-500" : "hover:ring-white/20",
                "cursor-grab active:cursor-grabbing select-none"
              ].join(" ")}
              draggable
              onDragStart={(ev) => {
                ev.dataTransfer.setData("text/plain", String(idx));
                ev.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={handleDragOver}
              onDrop={(ev) => handleDrop(ev, idx)}
              onKeyDown={(e) => {
                // keyboard reorder: Ctrl/Cmd + ArrowLeft/Right to move
                if ((e.ctrlKey || e.metaKey) && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
                  e.preventDefault();
                  const arr = urls.slice();
                  const from = idx;
                  const dir = e.key === "ArrowLeft" ? -1 : 1;
                  const to = Math.max(0, Math.min(arr.length - 1, from + dir));
                  if (to === from) return;
                  const [m] = arr.splice(from, 1);
                  arr.splice(to, 0, m);
                  setUrlsAndEmit(arr);
                  setActiveIndex(to);
                }
              }}
            >
              <img src={u} alt="" className="h-full w-full object-cover" loading="lazy" draggable={false} />
              {/* index badge */}
              <span className="absolute top-1 left-1 rounded-md bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5">
                {idx + 1}
              </span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {activeIndex > 0 && (
            <button
              type="button"
              onClick={setAsCover}
              className="px-3 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white text-sm"
            >
              Set as cover
            </button>
          )}
          {urls.length > 1 && (
            <button
              type="button"
              onClick={removePhoto}
              className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </section>
  );
}