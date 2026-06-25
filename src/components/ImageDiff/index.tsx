import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { Columns2, SquareSplitHorizontal, Blend } from 'lucide-react';

interface ImageDiffProps {
  oldImage: string | null; // base64 or URL
  newImage: string | null;
  oldSize: number;
  newSize: number;
  mode?: 'side-by-side' | 'slider' | 'blend';
  filePath?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** Side-by-side image diff: two columns showing old and new images */
const SideBySideView: React.FC<{
  oldImage: string | null;
  newImage: string | null;
  oldSize: number;
  newSize: number;
}> = ({ oldImage, newImage, oldSize, newSize }) => {
  const { t } = useTranslation();

  return (
    <div className="flex gap-4 p-4">
      {/* Old image */}
      <div className="flex-1 flex flex-col items-center">
        <div
          className="text-xs font-medium mb-2 px-2 py-0.5 rounded"
          style={{ color: 'var(--accent-red)', backgroundColor: 'rgba(243, 139, 168, 0.15)' }}
        >
          {t('imageDiff.old')}
        </div>
        {oldImage ? (
          <div className="flex-1 flex items-center justify-center overflow-auto" style={{ backgroundColor: 'var(--bg-mantle)', borderRadius: 8 }}>
            <img
              src={oldImage}
              alt="Old"
              style={{ maxWidth: '100%', maxHeight: 400, objectFit: 'contain' }}
              draggable={false}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs" style={{ color: 'var(--text-subtle)', backgroundColor: 'var(--bg-mantle)', borderRadius: 8, minHeight: 200 }}>
            {t('imageDiff.noImage')}
          </div>
        )}
        <div className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
          {formatBytes(oldSize)}
        </div>
      </div>

      {/* New image */}
      <div className="flex-1 flex flex-col items-center">
        <div
          className="text-xs font-medium mb-2 px-2 py-0.5 rounded"
          style={{ color: 'var(--accent-green)', backgroundColor: 'rgba(166, 227, 161, 0.15)' }}
        >
          {t('imageDiff.new')}
        </div>
        {newImage ? (
          <div className="flex-1 flex items-center justify-center overflow-auto" style={{ backgroundColor: 'var(--bg-mantle)', borderRadius: 8 }}>
            <img
              src={newImage}
              alt="New"
              style={{ maxWidth: '100%', maxHeight: 400, objectFit: 'contain' }}
              draggable={false}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs" style={{ color: 'var(--text-subtle)', backgroundColor: 'var(--bg-mantle)', borderRadius: 8, minHeight: 200 }}>
            {t('imageDiff.noImage')}
          </div>
        )}
        <div className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
          {formatBytes(newSize)}
        </div>
      </div>
    </div>
  );
};

/** Slider image diff: overlay comparison with draggable divider */
const SliderView: React.FC<{
  oldImage: string | null;
  newImage: string | null;
  oldSize: number;
  newSize: number;
}> = ({ oldImage, newImage, oldSize, newSize }) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPosition, setSliderPosition] = useState(50); // percentage from left
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const rightClip = 100 - sliderPosition;

  return (
    <div className="flex flex-col p-4">
      {/* Image comparison area */}
      <div
        ref={containerRef}
        className="relative overflow-hidden"
        style={{ backgroundColor: 'var(--bg-mantle)', borderRadius: 8, minHeight: 200 }}
      >
        {/* Old image (bottom layer, full width) */}
        {oldImage && (
          <img
            src={oldImage}
            alt="Old"
            style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain', maxHeight: 400 }}
            draggable={false}
          />
        )}

        {/* New image (top layer, clipped from right) */}
        {newImage && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              clipPath: `inset(0 ${rightClip}% 0 0)`,
            }}
          >
            <img
              src={newImage}
              alt="New"
              style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: 400 }}
              draggable={false}
            />
          </div>
        )}

        {/* Slider handle */}
        <div
          onMouseDown={handleMouseDown}
          style={{
            position: 'absolute',
            top: 0,
            left: `${sliderPosition}%`,
            width: 3,
            height: '100%',
            backgroundColor: 'var(--accent-blue)',
            cursor: 'col-resize',
            transform: 'translateX(-50%)',
            zIndex: 10,
          }}
        >
          {/* Handle grip */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: 'var(--accent-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', gap: 2 }}>
              <div style={{ width: 2, height: 10, backgroundColor: 'white', borderRadius: 1 }} />
              <div style={{ width: 2, height: 10, backgroundColor: 'white', borderRadius: 1 }} />
            </div>
          </div>
        </div>

        {/* Labels */}
        <div
          className="absolute top-2 left-2 text-xs font-medium px-2 py-0.5 rounded"
          style={{ color: 'var(--accent-red)', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 5 }}
        >
          {t('imageDiff.old')}
        </div>
        <div
          className="absolute top-2 right-2 text-xs font-medium px-2 py-0.5 rounded"
          style={{ color: 'var(--accent-green)', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 5 }}
        >
          {t('imageDiff.new')}
        </div>
      </div>

      {/* Size info */}
      <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--text-subtle)' }}>
        <span>{t('imageDiff.old')}: {formatBytes(oldSize)}</span>
        <span>{t('imageDiff.new')}: {formatBytes(newSize)}</span>
      </div>
    </div>
  );
};

/** Blend image diff: overlay two images with adjustable blend ratio */
const BlendView: React.FC<{
  oldImage: string | null;
  newImage: string | null;
  oldSize: number;
  newSize: number;
}> = ({ oldImage, newImage, oldSize, newSize }) => {
  const { t } = useTranslation();
  const [blendRatio, setBlendRatio] = useState(50); // 0 = old only, 100 = new only

  return (
    <div className="flex flex-col p-4">
      {/* Image comparison area */}
      <div
        className="relative overflow-hidden"
        style={{ backgroundColor: 'var(--bg-mantle)', borderRadius: 8, minHeight: 200 }}
      >
        {/* Old image (bottom layer) */}
        {oldImage && (
          <img
            src={oldImage}
            alt="Old"
            style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain', maxHeight: 400 }}
            draggable={false}
          />
        )}

        {/* New image (top layer, with opacity) */}
        {newImage && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: blendRatio / 100,
              mixBlendMode: 'normal',
            }}
          >
            <img
              src={newImage}
              alt="New"
              style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: 400 }}
              draggable={false}
            />
          </div>
        )}

        {/* Labels */}
        <div
          className="absolute top-2 left-2 text-xs font-medium px-2 py-0.5 rounded"
          style={{ color: 'var(--accent-red)', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 5 }}
        >
          {t('imageDiff.old')}
        </div>
        <div
          className="absolute top-2 right-2 text-xs font-medium px-2 py-0.5 rounded"
          style={{ color: 'var(--accent-green)', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 5 }}
        >
          {t('imageDiff.new')}
        </div>
      </div>

      {/* Blend ratio slider */}
      <div className="flex items-center gap-3 mt-3">
        <span className="text-xs" style={{ color: 'var(--accent-red)' }}>
          {t('imageDiff.old')}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={blendRatio}
          onChange={(e) => setBlendRatio(Number(e.target.value))}
          className="flex-1"
          style={{ accentColor: 'var(--accent-blue)' }}
        />
        <span className="text-xs" style={{ color: 'var(--accent-green)' }}>
          {t('imageDiff.new')}
        </span>
        <span className="text-xs font-mono" style={{ color: 'var(--text-subtle)', minWidth: 36, textAlign: 'right' }}>
          {blendRatio}%
        </span>
      </div>

      {/* Size info */}
      <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--text-subtle)' }}>
        <span>{t('imageDiff.old')}: {formatBytes(oldSize)}</span>
        <span>{t('imageDiff.new')}: {formatBytes(newSize)}</span>
      </div>
    </div>
  );
};

export const ImageDiff: React.FC<ImageDiffProps> = ({
  oldImage,
  newImage,
  oldSize,
  newSize,
  mode = 'side-by-side',
  filePath,
}) => {
  const { t } = useTranslation();
  const [currentMode, setCurrentMode] = useState<'side-by-side' | 'slider' | 'blend'>(mode);

  return (
    <div>
      {/* File header */}
      <div
        className="px-3 py-1.5 flex items-center justify-between border-b"
        style={{
          backgroundColor: 'var(--bg-overlay)',
          borderBottomColor: 'var(--border-color)',
          color: 'var(--text-primary)',
        }}
      >
        <span className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold" style={{ backgroundColor: 'var(--accent-mauve)', color: 'var(--bg-base)' }}>
            M
          </span>
          <span>{filePath ?? 'image'}</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentMode('side-by-side')}
            className="p-1 rounded transition-colors"
            style={{
              backgroundColor: currentMode === 'side-by-side' ? 'var(--accent-blue)' : 'transparent',
              color: currentMode === 'side-by-side' ? 'var(--bg-base)' : 'var(--text-subtle)',
            }}
            title={t('imageDiff.sideBySide')}
          >
            <Columns2 size={14} />
          </button>
          <button
            onClick={() => setCurrentMode('slider')}
            className="p-1 rounded transition-colors"
            style={{
              backgroundColor: currentMode === 'slider' ? 'var(--accent-blue)' : 'transparent',
              color: currentMode === 'slider' ? 'var(--bg-base)' : 'var(--text-subtle)',
            }}
            title={t('imageDiff.slider')}
          >
            <SquareSplitHorizontal size={14} />
          </button>
          <button
            onClick={() => setCurrentMode('blend')}
            className="p-1 rounded transition-colors"
            style={{
              backgroundColor: currentMode === 'blend' ? 'var(--accent-blue)' : 'transparent',
              color: currentMode === 'blend' ? 'var(--bg-base)' : 'var(--text-subtle)',
            }}
            title={t('imageDiff.blend')}
          >
            <Blend size={14} />
          </button>
        </div>
      </div>

      {/* Image content */}
      {currentMode === 'side-by-side' ? (
        <SideBySideView oldImage={oldImage} newImage={newImage} oldSize={oldSize} newSize={newSize} />
      ) : currentMode === 'slider' ? (
        <SliderView oldImage={oldImage} newImage={newImage} oldSize={oldSize} newSize={newSize} />
      ) : (
        <BlendView oldImage={oldImage} newImage={newImage} oldSize={oldSize} newSize={newSize} />
      )}
    </div>
  );
};

/** Check if a file path is an image based on extension */
export function isImageFile(filePath: string): boolean {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.ico'];
  const lowerPath = filePath.toLowerCase();
  return imageExtensions.some((ext) => lowerPath.endsWith(ext));
}
