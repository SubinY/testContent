"use client";

interface PhoneMockupProps {
  html: string;
  title: string;
  viewportWidth?: number;
  viewportHeight?: number;
}

export default function PhoneMockup(props: PhoneMockupProps) {
  const { html, title, viewportWidth = 390, viewportHeight = 844 } = props;
  const previewMaxWidth = 340;
  const scale = Math.min(1, previewMaxWidth / viewportWidth);
  const scaledWidth = Math.round(viewportWidth * scale);
  const scaledHeight = Math.round(viewportHeight * scale);

  return (
    <div className="mx-auto w-full max-w-[420px] rounded-[40px] border-[10px] border-slate-900 bg-slate-950 p-3 shadow-[0_26px_60px_rgba(15,23,42,0.22)]">
      <div className="mb-2 flex justify-center">
        <div className="h-1.5 w-20 rounded-full bg-slate-700" />
      </div>
      <div className="overflow-hidden rounded-[28px] border border-slate-800 bg-white">
        <div
          className="relative mx-auto"
          style={{
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`
          }}
        >
          <iframe
            title={title}
            srcDoc={html}
            sandbox="allow-scripts allow-forms allow-same-origin"
            style={{
              width: `${viewportWidth}px`,
              height: `${viewportHeight}px`,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              border: "0"
            }}
          />
        </div>
      </div>
    </div>
  );
}
