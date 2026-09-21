from pathlib import Path
from PIL import Image

source = Path("client/public/images/hero/ero-models-hero.png")
target = Path("client/public/images/hero/ero-models-hero.webp")
image = Image.open(source).convert("RGB")
if image.width > 1600:
    image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
image.save(target, "WEBP", quality=84, method=6)
print(f"saved {target} {image.width}x{image.height}")
