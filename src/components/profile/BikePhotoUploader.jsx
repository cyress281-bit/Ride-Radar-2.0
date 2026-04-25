import { useState } from 'react';
import { prepareLocalImage, getImagePreview } from '@/lib/localImageUpload';
import { Button } from '@/components/ui/button';
import { Bike, ImagePlus, X } from 'lucide-react';

export default function BikePhotoUploader({ image, onChange }) {
  const [processing, setProcessing] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const preview = getImagePreview(image);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    setUploadError('');
    try {
      const localImage = await prepareLocalImage(file, 'bike');
      onChange(localImage);
    } catch (error) {
      setUploadError(error?.response?.data?.error || error.message || 'Image validation failed. Please try another image.');
    } finally {
      setProcessing(false);
      e.target.value = '';
    }
  };

  return (
    <div className="rounded-2xl border border-border/70 bg-black/30 p-3 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)]">
      {preview ? (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-secondary/30">
            <img src={preview} className="h-36 w-full object-cover" alt="Bike preview" />
            <div className="absolute left-3 top-3 rounded-full border border-primary/30 bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary backdrop-blur-md">
              Bike photo
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex h-10 cursor-pointer items-center justify-center rounded-full border border-border/80 bg-secondary/20 text-xs font-bold text-muted-foreground transition hover:border-primary/50 hover:text-primary">
              <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              {processing ? 'Preparing...' : 'Replace'}
            </label>
            <Button type="button" variant="outline" onClick={() => onChange('')} className="h-10 rounded-full text-xs text-muted-foreground hover:border-destructive/50 hover:text-destructive">
              <X className="h-3.5 w-3.5" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-primary/25 bg-primary/5 px-4 py-5 text-center transition hover:border-primary/50 hover:bg-primary/10">
          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
            {processing ? <ImagePlus className="h-4 w-4 animate-pulse" /> : <Bike className="h-4 w-4" />}
          </div>
          <div className="text-sm font-bold text-foreground">{processing ? 'Preparing preview...' : 'Add one bike photo'}</div>
          <div className="mt-1 text-xs text-muted-foreground">Optional for V1. One clean bike image only.</div>
        </label>
      )}
      {uploadError && <p className="mt-2 text-sm text-destructive">{uploadError}</p>}
    </div>
  );
}