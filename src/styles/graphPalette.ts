import { argbFromHex, hexFromArgb, Hct } from '@material/material-color-utilities';
/** WCAG contrast for the CSS hex/rgb forms emitted by our theme tokens. */
export function graphContrast(a: string, b: string): number {
  const luminance = (text: string) => {
    const rgb = text.startsWith('#') ? [1,3,5].map(i=>parseInt(text.slice(i,i+2),16)) : (text.match(/[\d.]+/g) ?? []).slice(0,3).map(Number);
    const linear = rgb.map(v=>{ const n=v/255; return n<=0.04045 ? n/12.92 : ((n+0.055)/1.055)**2.4; });
    return (linear[0] ?? 0)*0.2126+(linear[1] ?? 0)*0.7152+(linear[2] ?? 0)*0.0722;
  };
  const x=luminance(a), y=luminance(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
}
/** Eight hue rotations with >=3:1 non-text contrast against canvas and panel. */
export function graphPalette(seed: string, dark: boolean, backgrounds: readonly string[]): string[] {
  const base=Hct.fromInt(argbFromHex(seed));
  return Array.from({length:8},(_,i)=>{
    let tone=dark ? 78 : 38;
    let color=hexFromArgb(Hct.from((base.hue+i*45)%360,Math.max(45,base.chroma),tone).toInt());
    while(backgrounds.some(bg=>graphContrast(color,bg)<3) && tone>5 && tone<95){tone+=dark ? 1 : -1;color=hexFromArgb(Hct.from((base.hue+i*45)%360,Math.max(45,base.chroma),tone).toInt());}
    return color;
  });
}
