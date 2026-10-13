"""Regenerate local variable assets: python -m pip install fonttools brotli; python scripts/subset-fonts.py."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset
import shutil
root = Path(__file__).resolve().parent.parent
out = root / 'src/styles/fonts'
out.mkdir(exist_ok=True)
flex = TTFont(root / 'node_modules/@fontsource-variable/roboto-flex/files/roboto-flex-latin-full-normal.woff2')
pinned = {axis.axisTag: axis.defaultValue for axis in flex['fvar'].axes if axis.axisTag not in {'wght', 'wdth', 'opsz'}}
flex = instantiateVariableFont(flex, pinned, inplace=True)
flex.recalcTimestamp = False
flex.flavor = 'woff2'
flex.save(out / 'roboto-flex-latin.woff2')
shutil.copyfile(root / 'node_modules/@fontsource-variable/roboto-mono/files/roboto-mono-latin-wght-normal.woff2', out / 'roboto-mono-latin.woff2')
symbols = TTFont(root / 'node_modules/material-symbols/material-symbols-rounded.woff2')
options = subset.Options()
options.layout_features = ['*']
options.layout_closure = False
subsetter = subset.Subsetter(options=options)
icons = 'light_mode brightness_auto dark_mode palette close check restart_alt play_arrow'.split()
subsetter.populate(text=' '.join(icons), glyphs=[glyph for name in icons for glyph in (name, name + '.fill') if glyph in symbols.getGlyphOrder()])
subsetter.subset(symbols)
symbols.recalcTimestamp = False
symbols.flavor = 'woff2'
symbols.save(out / 'material-symbols-rounded.woff2')
for name, package in [('roboto-flex', '@fontsource-variable/roboto-flex'), ('roboto-mono', '@fontsource-variable/roboto-mono'), ('material-symbols', 'material-symbols')]:
    shutil.copyfile(root / f'node_modules/{package}/LICENSE', out / f'{name}-LICENSE.txt')
print({p.name: p.stat().st_size for p in out.glob('*.woff2')})
