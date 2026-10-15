"""WCAG 2 contrast ratios for the Headliner design tokens (design/DESIGN.md). Run: python3 design/contrast.py"""
def lum(h):
    h=h.lstrip('#'); r,g,b=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    f=lambda c: c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)
def cr(a,b):
    la,lb=sorted([lum(a),lum(b)],reverse=True); return (la+0.05)/(lb+0.05)
S={
"A light":dict(bg="#F2F2EF",sheet="#FFFFFF",sunk="#E9E9E5",text=["#111111","#44443F","#66665F","#1B2A9E","#A3200F"],marks=["#2638C9","#C42A1C","#83837C"],tint=[("#1B2A9E","#E6E9FB"),("#A3200F","#FBE7E4"),("#6B4A00","#FFF1C7"),("#FFFFFF","#2638C9"),("#FFFFFF","#111111")]),
"A dark":dict(bg="#0E0E0D",sheet="#181817",sunk="#222220",text=["#F1F1EC","#BDBDB5","#8F8F87","#A7B1FF","#FF9A8A"],marks=["#6878F2","#E5533F","#75756E"],tint=[("#A7B1FF","#1E2340"),("#FF9A8A","#3A1C17"),("#F2D48A","#2E2508"),("#0E0E0D","#A7B1FF"),("#0E0E0D","#F1F1EC")]),
"B dark":dict(bg="#0B0C0E",sheet="#15171B",sunk="#1E2126",text=["#E9EBEE","#A9AFB9","#868D99","#FFB733","#8FB0FF"],marks=["#C08300","#5A8CF0","#6A717D"],tint=[("#0B0C0E","#FFB733"),("#FFB733","#2A2006")]),
"B light":dict(bg="#E9EBEE",sheet="#FFFFFF",sunk="#F3F4F6",text=["#0F1114","#464C55","#626973","#7A5200","#2A55B0"],marks=["#A36D00","#3F6FD6","#80868F"],tint=[("#0F1114","#FFB733"),("#7A5200","#FFF1D6")]),
"C light":dict(bg="#FAFAF7",sheet="#FFFFFF",sunk="#F0F0EC",text=["#0D0D0D","#3D3D3D","#616161","#B00060","#005A91"],marks=["#E6007E","#0078BF","#858585"],tint=[("#B00060","#FFE0F0"),("#005A91","#DDEFFA"),("#FFFFFF","#E6007E"),("#0D0D0D","#E6007E")]),
"C dark":dict(bg="#111111",sheet="#1A1A1A",sunk="#232323",text=["#F5F5F2","#C2C2BE","#929290","#FF8CC6","#8CC8FF"],marks=["#E8429A","#2E8AD8","#77777A"],tint=[("#FF8CC6","#3A1428"),("#8CC8FF","#10263A"),("#111111","#E8429A")]),
}
for k,v in S.items():
    print("==",k)
    for surf in ("bg","sheet","sunk"):
        print(f"  {surf} {v[surf]}: text "+" ".join(f"{t}:{cr(t,v[surf]):.2f}" for t in v["text"])+" | marks "+" ".join(f"{m}:{cr(m,v[surf]):.2f}" for m in v["marks"]))
    print("  pairs "+" ".join(f"{a}/{b}:{cr(a,b):.2f}" for a,b in v["tint"]))
