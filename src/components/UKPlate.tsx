interface Props {
  reg: string;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: { height: 18, gbWidth: 14, gbFont: 6, regFont: 9,  px: "px-1.5" },
  md: { height: 24, gbWidth: 18, gbFont: 8, regFont: 12, px: "px-2"   },
  lg: { height: 36, gbWidth: 24, gbFont: 10, regFont: 18, px: "px-3"  },
};

export default function UKPlate({ reg, size = "md" }: Props) {
  const s = SIZES[size];
  return (
    <div
      className="inline-flex items-stretch rounded-md overflow-hidden border-2 border-gray-400 shadow flex-shrink-0"
      style={{ height: s.height }}
    >
      <div
        className="bg-[#003399] text-white flex items-center justify-center font-bold"
        style={{ width: s.gbWidth, fontSize: s.gbFont }}
      >
        GB
      </div>
      <div
        className={`bg-[#FFDD00] text-black font-black flex items-center ${s.px} tracking-widest`}
        style={{ fontSize: s.regFont, fontFamily: "monospace" }}
      >
        {reg}
      </div>
    </div>
  );
}

export function extractReg(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const m = notes.match(/Vehicle:\s*([A-Z0-9 ]{2,10})/i);
  return m ? m[1].trim() : null;
}
