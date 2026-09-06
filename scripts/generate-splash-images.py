#!/usr/bin/env python3
"""
מייצר את תמונות מסך הפתיחה (splash screen) של אייפון ל-public/splash/.

בלי זה, אייפון מתעלם מ-background_color של המניפסט בזמן הטעינה
הראשונית מהאייקון במסך הבית, ומציג מסך ריק/שחור עד שהעמוד עצמו עולה.
כל גודל מסך צריך תמונה בפיקסלים המדויקים שלו — אייפון לא מותח/מקטין
תמונה אחת לכל המכשירים. פורטרט בלבד, כי האתר נעול לכיוון הזה.

להרצה אחרי שינוי לוגו/טקסט: python3 scripts/generate-splash-images.py
(דורש: pip3 install --user pillow)

הרשימה למטה מגדירה גם את המערך שצריך להדביק ידנית ב-
appleWebApp.startupImage ב-src/app/layout.tsx — הסקריפט מדפיס אותו
בסוף, מוכן להעתקה. יש גם רשומה אחת בלי media (ברירת מחדל) — למכשיר
שהמידה המדויקת שלו לא ברשימה (כולל דגמים עתידיים) — שאותה מוסיפים
ידנית, הסקריפט לא מדפיס אותה כי היא לא תלויה בגודל ספציפי.

הכיתוב התחתון ("from" + שם) הוא באנגלית בכוונה — בדיוק הסגנון של
"from Meta" באינסטגרם — ולכן אין כאן שאלת bidi בכלל.
"""

import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    sys.exit("חסר Pillow.  התקנה:  pip3 install --user pillow")

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
OUT_DIR = PUBLIC / "splash"
OUT_DIR.mkdir(exist_ok=True)

SKY = (146, 173, 197, 255)  # --color-sky, #92adc5 (globals.css)
WORDMARK = PUBLIC / "logo-wordmark-white-v4.png"
CREDIT_LABEL = "from"
CREDIT_NAME = "Shir Levy"
LABEL_COLOR = (255, 255, 255, 165)   # "from" — עדין יותר, כמו באינסטגרם
NAME_COLOR = (255, 255, 255, 230)    # השם — בולט יותר
FONT_CANDIDATES = [
    r"C:\Windows\Fonts\arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]
FONT_BOLD_CANDIDATES = [
    r"C:\Windows\Fonts\arialbd.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]

# (pixel_w, pixel_h, dpr, css_w, css_h) — פורטרט בלבד
DEVICES = [
    (750, 1334, 2, 375, 667),    # iPhone SE 2/3, 6/7/8
    (828, 1792, 2, 414, 896),    # iPhone 11, XR
    (1080, 2340, 3, 360, 780),   # iPhone 12/13 mini
    (1125, 2436, 3, 375, 812),   # iPhone X/XS/11 Pro
    (1170, 2532, 3, 390, 844),   # iPhone 12/13/14
    (1179, 2556, 3, 393, 852),   # iPhone 14/15/16 Pro, 15/16
    (1206, 2622, 3, 402, 874),   # iPhone 16 Pro, 17/17 Pro (ככל הידוע)
    (1242, 2688, 3, 414, 896),   # iPhone XS Max/11 Pro Max
    (1284, 2778, 3, 428, 926),   # iPhone 12/13/14 Pro Max, 15/16 Plus
    (1290, 2796, 3, 430, 932),   # iPhone 14/15 Pro Max
    (1320, 2868, 3, 440, 956),   # iPhone 16/17 Pro Max (ככל הידוע)
]

FILL_RATIO = 0.55  # רוחב הוורדמארק יחסית לרוחב המסך

if not WORDMARK.exists():
    sys.exit(f"לא נמצא {WORDMARK}")

font_path = next((p for p in FONT_CANDIDATES if Path(p).exists()), None)
bold_font_path = next((p for p in FONT_BOLD_CANDIDATES if Path(p).exists()), None)
if not font_path or not bold_font_path:
    sys.exit("לא נמצא גופן זמין (arial.ttf/arialbd.ttf) — עדכנו FONT_CANDIDATES")

wordmark = Image.open(WORDMARK).convert("RGBA")

generated = []
for (w, h, dpr, css_w, css_h) in DEVICES:
    canvas = Image.new("RGBA", (w, h), SKY)

    target_w = int(w * FILL_RATIO)
    scale = target_w / wordmark.width
    target_h = int(wordmark.height * scale)
    resized = wordmark.resize((target_w, target_h), Image.LANCZOS)
    logo_x = (w - target_w) // 2
    logo_y = (h - target_h) // 2
    canvas.alpha_composite(resized, (logo_x, logo_y))

    # למטה ליד תחתית המסך, שתי שורות — בדיוק כמו "from Meta" באינסטגרם.
    # הלוגו נשאר ממורכז אנכית באמצע בפני עצמו, לא צמוד לכיתוב.
    draw = ImageDraw.Draw(canvas)
    label_font = ImageFont.truetype(font_path, max(12, round(w * 0.026)))
    name_font = ImageFont.truetype(bold_font_path, max(14, round(w * 0.034)))

    label_bbox = draw.textbbox((0, 0), CREDIT_LABEL, font=label_font)
    name_bbox = draw.textbbox((0, 0), CREDIT_NAME, font=name_font)
    label_w = label_bbox[2] - label_bbox[0]
    label_h = label_bbox[3] - label_bbox[1]
    name_w = name_bbox[2] - name_bbox[0]
    name_h = name_bbox[3] - name_bbox[1]
    line_gap = round(h * 0.008)

    name_y = h - round(h * 0.06) - name_h
    label_y = name_y - line_gap - label_h

    draw.text(
        ((w - label_w) // 2 - label_bbox[0], label_y),
        CREDIT_LABEL, font=label_font, fill=LABEL_COLOR,
    )
    draw.text(
        ((w - name_w) // 2 - name_bbox[0], name_y),
        CREDIT_NAME, font=name_font, fill=NAME_COLOR,
    )

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
