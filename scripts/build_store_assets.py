from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "store-assets"
SOURCE = ASSETS / "source"
SIZE = (1280, 800)
BACKGROUND = "#fcf5ec"
INK = "#171513"
MUTED = "#665f58"
PURPLE = "#7655df"
CARD = "#fff0df"


def font(size, bold=False):
    suffix = "Arial Bold.ttf" if bold else "Arial.ttf"
    return ImageFont.truetype(f"/System/Library/Fonts/Supplemental/{suffix}", size)


def canvas():
    return Image.new("RGB", SIZE, BACKGROUND)


def draw_text(image, position, text, size, color=INK, bold=False):
    ImageDraw.Draw(image).text(position, text, font=font(size, bold), fill=color)


def paste_screenshot(image, source_name, box, radius=18):
    source = Image.open(SOURCE / source_name).convert("RGB")
    x1, y1, x2, y2 = box
    width, height = x2 - x1, y2 - y1
    scale = max(width / source.width, height / source.height)
    resized = source.resize((round(source.width * scale), round(source.height * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - width) // 2
    top = (resized.height - height) // 2
    cropped = resized.crop((left, top, left + width, top + height))

    mask = Image.new("L", (width, height), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, width, height), radius, fill=255)
    image.paste(cropped, (x1, y1), mask)


def add_shadow(image, box, radius=18):
    x1, y1, x2, y2 = box
    layer = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle((x1, y1 + 10, x2, y2 + 10), radius, fill=(60, 48, 36, 52))
    image.paste(layer.filter(ImageFilter.GaussianBlur(14)), (0, 0), layer.filter(ImageFilter.GaussianBlur(14)))


def screenshot(image, source_name, box):
    add_shadow(image, box)
    paste_screenshot(image, source_name, box)


def build_highlight():
    image = canvas()
    draw_text(image, (70, 55), "Highlight as you read.", 56, bold=True)
    draw_text(image, (72, 132), "Select the passages that matter, then review every clip in one focused side panel.", 25, MUTED)
    screenshot(image, "highlight-and-collect.png", (70, 238, 1210, 748))
    image.save(ASSETS / "highlight-and-collect.png", quality=95)


def build_settings():
    image = canvas()
    draw_text(image, (80, 113), "Make it yours.", 56, bold=True)
    draw_text(image, (80, 194), "Choose where clips go and how your highlights look.", 25, MUTED)
    draw = ImageDraw.Draw(image)
    labels = [
        "Daily note or custom file path",
        "Background or underline highlights",
        "Sidebar theme and source links",
    ]
    for index, label in enumerate(labels):
        top = 292 + index * 126
        draw.rounded_rectangle((80, top, 670, top + 102), 16, fill=CARD)
        draw.ellipse((109, top + 39, 135, top + 65), fill=PURPLE)
        draw_text(image, (156, top + 32), label, 27, bold=True)
    screenshot(image, "customize-settings.png", (792, 70, 1202, 730))
    image.save(ASSETS / "customize-settings.png", quality=95)


def build_save():
    image = canvas()
    draw_text(image, (80, 62), "Save straight to Obsidian.", 56, bold=True)
    draw_text(image, (82, 139), "Send a complete set of highlights as Markdown quotes, with the original source link.", 25, MUTED)
    screenshot(image, "save-to-obsidian.png", (80, 245, 1200, 638))
    image.save(ASSETS / "save-to-obsidian.png", quality=95)


if __name__ == "__main__":
    build_highlight()
    build_settings()
    build_save()
