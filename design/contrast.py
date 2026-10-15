"""WCAG 2 contrast ratios for the Headliner design tokens (Direction C, design/DESIGN.md).
Run: python3 design/contrast.py"""


def lum(h):
    h = h.lstrip("#")
    r, g, b = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def cr(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True)
    return (la + 0.05) / (lb + 0.05)


MODES = {
    "light": dict(
        surfaces={"paper": "#FAFAF7", "sheet": "#FFFFFF", "sunk": "#F0F0EC"},
        text={"ink": "#0D0D0D", "ink-2": "#3D3D3D", "ink-3": "#616161", "qloo-text": "#B00060", "llm-text": "#005A91"},
        marks={"qloo": "#E6007E", "llm": "#0078BF", "neutral": "#858585"},
        pairs=[("on-qloo", "#FFFFFF", "#E6007E"), ("button paper on ink", "#FAFAF7", "#0D0D0D"),
               ("panel-text", "#F5F5F2", "#0D0D0D"), ("panel-text-2", "#B8B8B4", "#0D0D0D"), ("panel-text-3", "#8E8E8A", "#0D0D0D"),
               ("panel-qloo", "#FF5CAD", "#0D0D0D"), ("panel-llm", "#5CB3FF", "#0D0D0D"),
               ("seq-1", "#0D0D0D", "#E4E4DF"), ("seq-2", "#0D0D0D", "#BDBDB7"), ("seq-3", "#FFFFFF", "#6F6F6A"),
               ("seq-4", "#FFFFFF", "#4A4A46"), ("seq-5", "#FFFFFF", "#1F1F1D")],
    ),
    "dark": dict(
        surfaces={"paper": "#111111", "sheet": "#1A1A1A", "sunk": "#232323"},
        text={"ink": "#F5F5F2", "ink-2": "#C2C2BE", "ink-3": "#929290", "qloo-text": "#FF8CC6", "llm-text": "#8CC8FF"},
        marks={"qloo": "#E8429A", "llm": "#2E8AD8", "neutral": "#77777A"},
        pairs=[("on-qloo", "#111111", "#E8429A"), ("button ink-bg", "#111111", "#F5F5F2"),
               ("panel-text", "#F5F5F2", "#050505"), ("panel-text-2", "#B8B8B4", "#050505"), ("panel-text-3", "#929290", "#050505"),
               ("panel-qloo", "#FF8CC6", "#050505"), ("panel-llm", "#8CC8FF", "#050505"),
               ("seq-1", "#F5F5F2", "#2A2A28"), ("seq-2", "#F5F5F2", "#45453F"), ("seq-3", "#111111", "#8C8C86"),
               ("seq-4", "#111111", "#BDBDB7"), ("seq-5", "#111111", "#E8E8E3")],
    ),
}

if __name__ == "__main__":
    for mode, v in MODES.items():
        print(f"== {mode}")
        for sn, sv in v["surfaces"].items():
            t = " ".join(f"{k} {cr(c, sv):.2f}" for k, c in v["text"].items())
            m = " ".join(f"{k} {cr(c, sv):.2f}" for k, c in v["marks"].items())
            print(f"  on {sn} {sv}: text [{t}] marks [{m}]")
        for n, a, b in v["pairs"]:
            print(f"  {n}: {a} on {b} = {cr(a, b):.2f}")
