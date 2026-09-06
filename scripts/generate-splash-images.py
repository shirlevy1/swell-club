#!/usr/bin/env python3
"""
מייצר את תמונות מסך הפתיחה (splash screen) של אייפון ל-public/splash/.

בלי זה, אייפון מתעלם מ-background_color של המניפסט בזמן הטעינה
הראשונית מהאייקון במסך הבית, ומציג מסך ריק/שחור עד שהעמוד עצמו עולה.
כל גודל מסך צריך תמונה בפיקסלים המדויקים שלו — אייפון לא מותח/מקטין
תמונה אחת לכל המכשירים. פורטרט בלבד, כי האתר נעול לכיוון הזה.

להרצה אחרי שינוי לוגו: python3 scripts/generate-splash-images.py
(דורש: pip3 install --user pillow)

הרשימה למטה מגדירה גם את המערך שצריך להדביק ידנית ב-
appleWebApp.startupImage ב-src/app/layout.tsx — הסקריפט מדפיס אותו
בסוף, מוכן להעתקה.
"""

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("חסר Pillow.  התקנה:  pip3 install --user pillow")

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
OUT_DIR = PUBLIC / "splash"
OUT_DIR.mkdir(exist_ok=True)

SKY = (146, 173, 197, 255)  # --color-sky, #92adc5 (globals.css)
WORDMARK = PUBLIC / "logo-wordmark-white-v4.png"

# (pixel_w, pixel_h, dpr, css_w, css_h) — פורטרט בלבד
DEVICES = [
    (750, 1334, 2, 375, 667),    # iPhone SE 2/3, 6/7/8
    (828, 1792, 2, 414, 896),    # iPhone 11, XR
    (1080, 2340, 3, 360, 780),   # iPhone 12/13 mini
    (1125, 2436, 3, 375, 812),   # iPhone X/XS/11 Pro
    (1170, 2532, 3, 390, 844),   # iPhone 12/13/14
    (1179, 2556, 3, 393, 852),   # iPhone 14/15/16 Pro, 15/16
    (1206, 2622, 3, 402, 874),   # iPhone 16 Pro
    (1242, 2688, 3, 414, 896),   # iPhone XS Max/11 Pro Max
    (1284, 2778, 3, 428, 926),   # iPhone 12/13/14 Pro Max, 15/16 Plus
    (1290, 2796, 3, 430, 932),   # iPhone 14/15 Pro Max
    (1320, 2868, 3, 440, 956),   # iPhone 16 Pro Max
]

FILL_RATIO = 0.55  # רוחב הוורדמארק יחסית לרוחב המסך

if not WORDMARK.exists():
    sys.exit(f"לא נמצא {WORDMARK}")

wordmark = Image.open(WORDMARK).convert("RGBA")

generated = []
for (w, h, dpr, css_w, css_h) in DEVICES:
    canvas = Image.new("RGBA", (w, h), SKY)
    target_w = int(w * FILL_RATIO)
    scale = target_w / wordmark.width
    target_h = int(wordmark.height * scale)
    resized = wordmark.resize((target_w, target_h), Image.LANCZOS)
    x = (w - target_w) // 2
    y = (h - target_h) // 2
    canvas.alpha_composite(resized, (x, y))
    filename = f"splash-{w}x{h}.png"
    canvas.convert("RGB").save(OUT_DIR / filename, "PNG")
    generated.append((filename, css_w, css_h, dpr))
    print("wrote", filename)

print("\n--- הדביקו במקום startupImage ב-src/app/layout.tsx ---")
for filename, css_w, css_h, dpr in generated:
    media = (
        f"(device-width: {css_w}px) and (device-height: {css_h}px) "
        f"and (-webkit-device-pixel-ratio: {dpr}) and (orientation: portrait)"
    )
    print(f'      {{ url: "/splash/{filename}", media: "{media}" }},')
