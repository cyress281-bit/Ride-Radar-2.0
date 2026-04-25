import { useState } from 'react';
import { Image, Upload, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { validateImageUpload } from '@/lib/uploadValidation';

export default function AlertPhotoUploader({ images = [], onChange }) {
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const photos = images.filter(Boolean).slice(0, 2);
  const slots = photos.length < 2 ? [...photos, null] : photos;

  const uploadAt = async (file, index) => {
    if (!file) return;
    setUploadingIndex(index);
    try {
      await validateImageUpload(file, 'alert');
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const next = [...photos];
      next[index] = file_url;
      onChange(next.filter(Boolean).slice(0, 2));
    } finally {
      setUploadingIndex(null);
    }
  };

  const removeAt = (index) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-xs font-semibold text-muted-foreground">Optional photos</div>
        <div className="rounded-full border border-alert/25 bg-alert/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-alert">
          {photos.length}/2 max
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {slots.map((url, index) => (
          <div key={index} className="rounded-2xl border border-border/70 bg-black/30 p-2 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)]">
            {url ? (
              <div className="space-y-2">
                <div className="flex h-32 items-center justify-center overflow-hidden rounded-xl border border-alert/20 bg-black/45 p-1.5">
                  <img src={url} className="max-h-28 w-full object-contain" alt={`Alert preview ${index + 1}`} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex h-9 cursor-pointer items-center justify-center rounded-full border border-border/80 bg-secondary/20 text-xs font-bold text-muted-foreground transition hover:border-alert/50 hover:text-alert">
                    <input type="file" accept="image/*" onChange={(e) => uploadAt(e.target.files?.[0], index)} className="hidden" />
                    Replace
                  </label>
                  <button type="button" onClick={() => removeAt(index)} className="flex h-9 items-center justify-center rounded-full border border-border/80 bg-secondary/20 text-xs font-bold text-muted-foreground transition hover:border-destructive/50 hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-alert/30 bg-alert/5 px-3 text-center transition hover:border-alert/60 hover:bg-alert/10">
                <input type="file" accept="image/*" onChange={(e) => uploadAt(e.target.files?.[0], index)} className="hidden" disabled={photos.length >= 2} />
                {uploadingIndex === index ? <Upload className="mb-2 h-5 w-5 animate-pulse text-alert" /> : <Image className="mb-2 h-5 w-5 text-alert" />}
                <div className="text-sm font-bold text-foreground">{uploadingIndex === index ? 'Uploading...' : 'Add photo'}</div>
                <div className="mt-1 text-xs text-muted-foreground">Hazard, road, or scene context</div>
              </label>
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Attach up to 2 safety photos. Photos are optional.</p>
    </div>
  );
}