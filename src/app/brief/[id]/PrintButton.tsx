"use client";
export default function PrintButton() {
  return (
    <button className="pb no-print" onClick={() => window.print()}>
      Print / save as PDF
    </button>
  );
}
