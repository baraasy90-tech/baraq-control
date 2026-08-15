import { useEffect, useRef, useState } from "react";
import { SecondaryButton, ErrorText } from "@/components/ui";

interface SignaturePadProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

export function SignaturePad({ value, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawing = useRef(false);
  const hasStroke = useRef(false);
  const [preview, setPreview] = useState<string | null>(value);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    setPreview(value);
  }, [value]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1A2332";
  }, [preview]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (preview) setPreview(null);
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const ctx = canvas.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawing.current = true;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasStroke.current = true;
  };

  const handlePointerUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (hasStroke.current && canvasRef.current) {
      onChange(canvasRef.current.toDataURL("image/png"));
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    hasStroke.current = false;
    setPreview(null);
    setUploadError("");
    onChange(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "image/png") {
      setUploadError("لازم يكون التوقيع بصيغة PNG تحديداً");
      return;
    }
    setUploadError("");
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      setPreview(dataUrl);
      onChange(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div className="relative border border-line rounded-lg bg-white h-40 overflow-hidden touch-none">
        {preview ? (
          <img src={preview} alt="التوقيع" className="w-full h-full object-contain" />
        ) : (
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        )}
      </div>
      <p className="text-xs text-ink-soft mt-1.5">ارسم التوقيع مباشرة بالماوس/اللمس، أو ارفع صورة توقيعك الرسمي</p>
      <div className="mt-2 flex flex-wrap gap-2 items-center">
        <SecondaryButton type="button" onClick={handleClear} className="text-xs py-1.5 px-3">
          مسح التوقيع
        </SecondaryButton>
        <SecondaryButton type="button" onClick={() => fileInputRef.current?.click()} className="text-xs py-1.5 px-3">
          رفع صورة توقيع (PNG)
        </SecondaryButton>
        <input ref={fileInputRef} type="file" accept="image/png" onChange={handleUpload} className="hidden" />
      </div>
      <ErrorText>{uploadError}</ErrorText>
    </div>
  );
}
