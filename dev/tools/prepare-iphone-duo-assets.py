"""Rebuild the isolated device assets with usd-core==26.8 (Python 3.12).

Adapted from chuspeeism/iphone-duo/scripts/prepare-assets.py, commit 2662ebb.
Download the source USDZ into local output; commit only the flattened runtime
model and textures. No Apple wallpaper or launcher UI is used by this view.
"""
from pathlib import Path
from urllib.request import urlretrieve
from zipfile import ZipFile
from pxr import Sdf, Usd

root = Path(__file__).resolve().parents[2]
assets = root / "dev/iphone-duo/assets"
textures = assets / "textures"
textures.mkdir(parents=True, exist_ok=True)
source = root / "output/iphone-duo-assets/iPhone_Duo_Star_White.usdz"
source.parent.mkdir(parents=True, exist_ok=True)
url = "https://www.apple.com/105/media/us/iphone-duo/2026/9305e4b9-72d9-4c05-9381-b572adadd5e5/ar/iPhone_Duo_e-sim_Star-White_Variant.usdz"
if not source.exists():
    urlretrieve(url, source)
with ZipFile(source) as archive:
    for name in archive.namelist():
        if Path(name).suffix.lower() in {".png", ".jpg", ".jpeg", ".avif"}:
            (textures / Path(name).name).write_bytes(archive.read(name))
stage = Usd.Stage.Open(str(source))
stage.GetDefaultPrim().GetVariantSet("Pose").SetVariantSelection("Landscape")
flattened = Usd.Stage.Open(stage.Flatten())
for prim in flattened.Traverse():
    for attribute in prim.GetAttributes():
        value = attribute.Get()
        if isinstance(value, Sdf.AssetPath) and value.path:
            filename = Path(value.path.split("[")[-1].rstrip("]")).name
            attribute.Set(Sdf.AssetPath(f"textures/{filename}"))
flattened.GetRootLayer().Export(str(assets / "iPhone_Duo_Render.usdc"))
print("Prepared the Duo device model and textures.")
