#!/usr/bin/env python3
"""
Prayogshala Academy Logo Generator
Creates minimal and full logo assets in SVG, PNG, WebP, and ICO formats
based on the iconic Devanagari 'प्र' Laboratory glyph from the reference image.
"""

import os
import subprocess
import numpy as np
import matplotlib.pyplot as plt
from PIL import Image
from scipy.interpolate import splprep, splev

BASE_IMAGE_PATH = "/Users/sujay/.gemini/antigravity/brain/958de1aa-bd9c-4bb9-9a0b-a2bfd9e1e8c7/.user_uploaded/media_1794405494114_c31ab086.jpg"
WORKSPACE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(WORKSPACE, "public")
BRAND_DIR = os.path.join(PUBLIC_DIR, "brand")
SVG_DIR = os.path.join(BRAND_DIR, "svg")
PNG_DIR = os.path.join(BRAND_DIR, "png")
WEBP_DIR = os.path.join(BRAND_DIR, "webp")

for d in [SVG_DIR, PNG_DIR, WEBP_DIR]:
    os.makedirs(d, exist_ok=True)

print("1. Extracting contour from reference image...")
im = Image.open(BASE_IMAGE_PATH)
arr = np.array(im.convert("L"))
binary = (arr > 230).astype(float)
cs = plt.contour(binary, levels=[0.5])
plt.close()

seg0 = cs.allsegs[0][0]  # Outer boundary
seg1 = cs.allsegs[0][1]  # Inner counter

def fit_spline(seg, s, n_pts):
    step = max(1, len(seg) // 400)
    pts = seg[::step]
    if np.linalg.norm(pts[0] - pts[-1]) > 1e-4:
        pts = np.vstack([pts, pts[0]])
    tck, u = splprep([pts[:, 0], pts[:, 1]], s=s, per=True)
    u_new = np.linspace(0, 1, n_pts, endpoint=False)
    smooth = np.array(splev(u_new, tck)).T
    return smooth

sm0 = fit_spline(seg0, s=2.0, n_pts=84)
sm1 = fit_spline(seg1, s=1.0, n_pts=42)

orig_cx = 507.5
orig_cy = 487.0

def catmull_rom_to_bezier(pts):
    n = len(pts)
    d = f"M {pts[0,0]:.2f} {pts[0,1]:.2f} "
    for i in range(n):
        p0 = pts[(i - 1) % n]
        p1 = pts[i]
        p2 = pts[(i + 1) % n]
        p3 = pts[(i + 2) % n]
        c1 = p1 + (p2 - p0) / 6.0
        c2 = p2 - (p3 - p1) / 6.0
        d += f"C {c1[0]:.2f} {c1[1]:.2f}, {c2[0]:.2f} {c2[1]:.2f}, {p2[0]:.2f} {p2[1]:.2f} "
    d += "Z"
    return d

def get_glyph_path(cx_out, cy_out, target_height):
    scale = target_height / 509.0
    def tr(pts):
        return (pts - np.array([orig_cx, orig_cy])) * scale + np.array([cx_out, cy_out])
    p0 = tr(sm0)
    p1 = tr(sm1)
    return f"{catmull_rom_to_bezier(p0)} {catmull_rom_to_bezier(p1)}"

print("2. Generating SVG variations...")

# Path for standalone glyph centered at 256, 256 with height 340
glyph_d_standalone = get_glyph_path(256.0, 256.0, 340.0)

# Path for glyph with ACADEMY text underneath (slightly higher, centered at 256, 220 with height 290)
glyph_d_academy = get_glyph_path(256.0, 215.0, 285.0)

# Path for horizontal lockup icon (centered at 80, 80 with height 100)
glyph_d_horiz = get_glyph_path(80.0, 80.0, 100.0)

# 1. Standalone Minimal Mark (Cyan Gradient)
svg_mark_cyan = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22d3ee" />
      <stop offset="100%" stop-color="#0891b2" />
    </linearGradient>
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="12" flood-color="#06b6d4" flood-opacity="0.35" />
    </filter>
  </defs>
  <path d="{glyph_d_standalone}" fill="url(#cyanGrad)" filter="url(#softGlow)" fill-rule="evenodd" />
</svg>'''

# 2. Standalone Minimal Mark (Pure White for Dark Mode)
svg_mark_white = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <filter id="whiteGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="16" flood-color="#38bdf8" flood-opacity="0.25" />
    </filter>
  </defs>
  <path d="{glyph_d_standalone}" fill="#ffffff" filter="url(#whiteGlow)" fill-rule="evenodd" />
</svg>'''

# 3. Standalone Minimal Mark (Dark Slate for Light Mode)
svg_mark_dark = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <path d="{glyph_d_standalone}" fill="#0f172a" fill-rule="evenodd" />
</svg>'''

# 4. Minimal Mark + ACADEMY Typography
svg_academy = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="acadCyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22d3ee" />
      <stop offset="100%" stop-color="#0891b2" />
    </linearGradient>
    <filter id="glowAcad" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="14" flood-color="#06b6d4" flood-opacity="0.3" />
    </filter>
  </defs>
  <path d="{glyph_d_academy}" fill="url(#acadCyan)" filter="url(#glowAcad)" fill-rule="evenodd" />
  <!-- Minimal Academic Divider / Underline Accent -->
  <line x1="160" y1="395" x2="352" y2="395" stroke="#06b6d4" stroke-width="2.5" stroke-linecap="round" stroke-opacity="0.4" />
  <circle cx="256" cy="395" r="3.5" fill="#22d3ee" />
  <!-- ACADEMY Text -->
  <text x="256" y="440" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="34" font-weight="800" letter-spacing="0.42em" fill="#0891b2">ACADEMY</text>
</svg>'''

# 5. Minimal Mark + ACADEMY Badge (Squircle Dark Mode / Glass)
svg_academy_badge = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="badgeBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a1526" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="badgeBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#0891b2" stop-opacity="0.15" />
    </linearGradient>
    <linearGradient id="cyanText" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#22d3ee" />
    </linearGradient>
    <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="20" flood-color="#000000" flood-opacity="0.6" />
      <feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="#06b6d4" flood-opacity="0.25" />
    </filter>
  </defs>
  <!-- Background Squircle Card -->
  <rect x="24" y="24" width="464" height="464" rx="108" fill="url(#badgeBg)" stroke="url(#badgeBorder)" stroke-width="3" filter="url(#badgeShadow)" />
  <!-- Subtle Medical Cross/Grid Accents -->
  <circle cx="256" cy="215" r="160" fill="none" stroke="#06b6d4" stroke-opacity="0.08" stroke-width="1.5" stroke-dasharray="4 6" />
  <!-- White Pra Glyph -->
  <path d="{glyph_d_academy}" fill="#ffffff" fill-rule="evenodd" />
  <!-- Academy Pill Badge -->
  <g transform="translate(146, 400)">
    <rect width="220" height="42" rx="21" fill="#083344" stroke="#06b6d4" stroke-width="1.5" stroke-opacity="0.5" />
    <text x="110" y="27" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="17" font-weight="800" letter-spacing="0.32em" fill="url(#cyanText)">ACADEMY</text>
  </g>
</svg>'''

# 6. Full Clinical Laboratory App Icon (Duo-tone Medical Lab Aesthetic like base image)
svg_app_icon = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="labBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1ae7f4" />
      <stop offset="50%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#0b5472" />
    </linearGradient>
    <linearGradient id="labSheen" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35" />
      <stop offset="35%" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>
    <radialGradient id="labSpotlight" cx="50%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </radialGradient>
    <filter id="iconShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#043244" flood-opacity="0.45" />
    </filter>
    <clipPath id="squircleClip">
      <rect x="0" y="0" width="512" height="512" rx="115" />
    </clipPath>
  </defs>

  <g clip-path="url(#squircleClip)">
    <!-- Base Lab Gradient -->
    <rect width="512" height="512" fill="url(#labBg)" />
    <!-- Radial Lab Spotlight -->
    <rect width="512" height="512" fill="url(#labSpotlight)" />

    <!-- Laboratory Background Elements Silhouette (Centrifuge, Microscopes, glassware) -->
    <!-- Left bench & microscope silhouette -->
    <path d="M -20 340 L 160 300 L 160 520 L -20 520 Z" fill="#08708c" fill-opacity="0.35" />
    <path d="M 50 300 L 70 260 L 95 260 L 105 300 Z M 75 250 L 90 250 L 85 220 L 75 220 Z" fill="#08708c" fill-opacity="0.45" />
    
    <!-- Right bench & analyzer silhouette -->
    <path d="M 360 300 L 532 340 L 532 520 L 360 520 Z" fill="#08708c" fill-opacity="0.35" />
    <path d="M 410 300 L 410 240 L 470 240 L 470 300 Z M 420 220 L 460 220 L 460 235 L 420 235 Z" fill="#08708c" fill-opacity="0.45" />
    <rect x="425" y="250" width="30" height="20" rx="3" fill="#15d6e8" fill-opacity="0.6" />

    <!-- Light Beams from ceiling -->
    <polygon points="120,0 160,0 200,80 140,80" fill="#ffffff" fill-opacity="0.2" />
    <polygon points="350,0 390,0 410,70 360,70" fill="#ffffff" fill-opacity="0.2" />

    <!-- Pure White Central Pra Glyph -->
    <path d="{glyph_d_standalone}" fill="#ffffff" filter="url(#iconShadow)" fill-rule="evenodd" />

    <!-- Subtle ACADEMY pill badge along the bottom -->
    <g transform="translate(166, 436)">
      <rect width="180" height="34" rx="17" fill="#053344" fill-opacity="0.65" stroke="#ffffff" stroke-width="1.2" stroke-opacity="0.5" />
      <text x="90" y="23" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" letter-spacing="0.34em" fill="#ffffff">ACADEMY</text>
    </g>

    <!-- Glossy Top Sheen -->
    <rect width="512" height="512" fill="url(#labSheen)" pointer-events="none" />
    <!-- Inner Border Highlight -->
    <rect x="1.5" y="1.5" width="509" height="509" rx="113.5" fill="none" stroke="#ffffff" stroke-width="2" stroke-opacity="0.35" />
  </g>
</svg>'''

# 7. Horizontal Brand Lockup (Icon Mark + Prayogshala stacked over Academy)
svg_horizontal = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 160" width="100%" height="100%">
  <defs>
    <linearGradient id="hGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22d3ee" />
      <stop offset="100%" stop-color="#0891b2" />
    </linearGradient>
    <linearGradient id="hIconBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#083344" />
    </linearGradient>
  </defs>

  <!-- Icon Container Squircle -->
  <g transform="translate(20, 20)">
    <rect width="120" height="120" rx="28" fill="url(#hIconBg)" stroke="#06b6d4" stroke-width="2" stroke-opacity="0.5" />
    <path d="{glyph_d_horiz}" fill="#ffffff" fill-rule="evenodd" />
  </g>

  <!-- Typography: Prayogshala on top, Academy below -->
  <g transform="translate(165, 78)">
    <text font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="900" fill="#0f172a">Prayogshala</text>
    <!-- ACADEMY positioned below Prayogshala -->
    <text x="3" y="34" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="800" letter-spacing="0.28em" fill="#0891b2">ACADEMY</text>
  </g>
</svg>'''

# 7b. Horizontal Brand Lockup for Dark Mode (White Prayogshala + Cyan ACADEMY)
svg_horizontal_dark = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 160" width="100%" height="100%">
  <!-- Icon Mark: Cyan Pra -->
  <g transform="translate(20, 20)">
    <path d="{glyph_d_horiz}" fill="#22d3ee" fill-rule="evenodd" />
  </g>

  <!-- Typography: White Prayogshala + Cyan ACADEMY below -->
  <g transform="translate(165, 78)">
    <text font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="900" fill="#ffffff">Prayogshala</text>
    <text x="3" y="34" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="800" letter-spacing="0.28em" fill="#22d3ee">ACADEMY</text>
  </g>
</svg>'''

# 8. Favicon SVG (32x32 ViewBox)
glyph_d_favicon = get_glyph_path(16.0, 16.0, 22.0)
svg_favicon = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <defs>
    <linearGradient id="favBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#14c5d8" />
      <stop offset="100%" stop-color="#0891b2" />
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="7" fill="url(#favBg)" />
  <path d="{glyph_d_favicon}" fill="#ffffff" fill-rule="evenodd" />
</svg>'''

files_to_save = {
    os.path.join(SVG_DIR, "logo-mark-cyan.svg"): svg_mark_cyan,
    os.path.join(SVG_DIR, "logo-mark-white.svg"): svg_mark_white,
    os.path.join(SVG_DIR, "logo-mark-dark.svg"): svg_mark_dark,
    os.path.join(SVG_DIR, "logo-academy.svg"): svg_academy,
    os.path.join(SVG_DIR, "logo-academy-badge.svg"): svg_academy_badge,
    os.path.join(SVG_DIR, "logo-app-icon.svg"): svg_app_icon,
    os.path.join(SVG_DIR, "logo-horizontal.svg"): svg_horizontal,
    os.path.join(SVG_DIR, "logo-horizontal-dark.svg"): svg_horizontal_dark,
    # Standard public root files
    os.path.join(PUBLIC_DIR, "logo.svg"): svg_mark_cyan,
    os.path.join(PUBLIC_DIR, "logo-academy.svg"): svg_academy,
    os.path.join(PUBLIC_DIR, "favicon.svg"): svg_favicon,
}

for path, content in files_to_save.items():
    with open(path, "w") as f:
        f.write(content)
    print(f"Saved SVG: {path}")

print("3. Rendering high-resolution PNGs via headless Chrome...")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

def render_svg_to_png(svg_path, out_png, width, height):
    tmp_html = f"/tmp/render_{width}x{height}.html"
    with open(tmp_html, "w") as f:
        f.write(f'''<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ margin: 0; padding: 0; background: transparent; overflow: hidden; }}
  img {{ width: {width}px; height: {height}px; display: block; }}
</style></head><body>
<img src="file://{svg_path}">
</body></html>''')
    
    cmd = [
        CHROME,
        "--headless",
        "--disable-gpu",
        f"--window-size={width},{height}",
        "--default-background-color=00000000",
        f"--screenshot={out_png}",
        f"file://{tmp_html}"
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if os.path.exists(tmp_html):
        os.remove(tmp_html)

# Render master PNGs
master_mark_svg = os.path.join(SVG_DIR, "logo-mark-cyan.svg")
master_acad_svg = os.path.join(SVG_DIR, "logo-academy.svg")
master_icon_svg = os.path.join(SVG_DIR, "logo-app-icon.svg")

# Render 1024x1024 master
render_svg_to_png(master_mark_svg, "/tmp/master_mark_1024.png", 1024, 1024)
render_svg_to_png(master_acad_svg, "/tmp/master_acad_1024.png", 1024, 1024)
render_svg_to_png(master_icon_svg, "/tmp/master_icon_1024.png", 1024, 1024)

# Use PIL Lanczos resizing for super clean crisp downsamples
mark_im = Image.open("/tmp/master_mark_1024.png")
acad_im = Image.open("/tmp/master_acad_1024.png")
icon_im = Image.open("/tmp/master_icon_1024.png")

# Standalone Mark sizes
for sz in [1024, 512, 256, 192, 128, 64, 32, 16]:
    out_p = os.path.join(PNG_DIR, f"logo-mark-{sz}.png")
    resized = mark_im.resize((sz, sz), Image.Resampling.LANCZOS)
    resized.save(out_p, "PNG")

# Academy Mark sizes
for sz in [1024, 512, 256, 128]:
    out_p = os.path.join(PNG_DIR, f"logo-academy-{sz}.png")
    resized = acad_im.resize((sz, sz), Image.Resampling.LANCZOS)
    resized.save(out_p, "PNG")

# App Icon sizes (with clinical lab background)
for sz in [1024, 512, 256, 192, 180, 128, 64, 32]:
    out_p = os.path.join(PNG_DIR, f"icon-{sz}.png")
    resized = icon_im.resize((sz, sz), Image.Resampling.LANCZOS)
    resized.save(out_p, "PNG")

# Standard web icons in public root:
icon_512 = icon_im.resize((512, 512), Image.Resampling.LANCZOS)
icon_512.save(os.path.join(PUBLIC_DIR, "icon-512.png"), "PNG")

icon_192 = icon_im.resize((192, 192), Image.Resampling.LANCZOS)
icon_192.save(os.path.join(PUBLIC_DIR, "icon-192.png"), "PNG")

icon_180 = icon_im.resize((180, 180), Image.Resampling.LANCZOS)
icon_180.save(os.path.join(PUBLIC_DIR, "apple-touch-icon.png"), "PNG")

# Generate WebP versions
print("4. Generating WebP versions...")
mark_im.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(WEBP_DIR, "logo-mark-512.webp"), "WEBP")
acad_im.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(WEBP_DIR, "logo-academy-512.webp"), "WEBP")
icon_im.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(WEBP_DIR, "icon-512.webp"), "WEBP")

# Generate multi-size favicon.ico (16, 32, 48)
print("5. Generating multi-resolution favicon.ico...")
fav_32_svg = os.path.join(PUBLIC_DIR, "favicon.svg")
render_svg_to_png(fav_32_svg, "/tmp/fav_master.png", 256, 256)
fav_im = Image.open("/tmp/fav_master.png")
fav_im.save(
    os.path.join(PUBLIC_DIR, "favicon.ico"),
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48)]
)

print("All logo formats successfully generated!")
