"use client";

interface PhoneMockupProps {
  html: string;
  title: string;
}

export default function PhoneMockup(props: PhoneMockupProps) {
  const { html, title } = props;

  return (
    <div className="mx-auto w-full max-w-[420px] rounded-[40px] border-[10px] border-slate-900 bg-slate-950 p-3 shadow-[0_26px_60px_rgba(15,23,42,0.22)]">
      <div className="mb-2 flex justify-center">
        <div className="h-1.5 w-20 rounded-full bg-slate-700" />
      </div>
      <div className="overflow-hidden rounded-[28px] border border-slate-800 bg-white">
        <iframe
          title={title}
          srcDoc={html}
          className="h-[720px] w-full"
          sandbox="allow-scripts allow-forms allow-same-origin"
        />
      </div>
    </div>
  );
}
