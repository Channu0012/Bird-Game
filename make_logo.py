import struct
import zlib

SIZE = 512


def set_pixel(img, x, y, color):
    if 0 <= x < SIZE and 0 <= y < SIZE:
        img[y][x] = color


img = [[(0, 0, 0, 255) for _ in range(SIZE)] for _ in range(SIZE)]

for y in range(SIZE):
    for x in range(SIZE):
        r = int(19 + (x / SIZE) * 40 + (y / SIZE) * 15)
        g = int(52 + (x / SIZE) * 60 + (y / SIZE) * 20)
        b = int(88 + (x / SIZE) * 100 + (y / SIZE) * 30)
        img[y][x] = (r, g, b, 255)

for y in range(SIZE):
    for x in range(SIZE):
        dx = x - 390
        dy = y - 110
        if dx * dx + dy * dy < 80 * 80:
            r, g, b, a = img[y][x]
            img[y][x] = (min(255, r + 120), min(255, g + 115), min(255, b + 60), a)

for y in range(SIZE):
    for x in range(SIZE):
        cx, cy = 250, 250
        dx = x - cx
        dy = y - cy
        if (dx * dx) / (120 ** 2) + (dy * dy) / (68 ** 2) <= 1:
            img[y][x] = (255, 209, 102, 255)

        if ((x - 230) ** 2) / (90 ** 2) + ((y - 266) ** 2) / (42 ** 2) <= 1:
            img[y][x] = (244, 185, 66, 255)

        if 220 < y < 280 and 330 < x < 420 and y < 0.9 * x - 25:
            img[y][x] = (255, 143, 31, 255)

        if (x - 292) ** 2 + (y - 225) ** 2 <= 9 ** 2:
            img[y][x] = (17, 24, 39, 255)

        if 370 < y < 430:
            img[y][x] = (26, 118, 88, 255)

        if y > 430:
            img[y][x] = (91, 66, 48, 255)

# Add a few soft cloud highlights
for x, y in [(145, 130), (210, 96), (320, 118), (410, 142)]:
    for yy in range(y - 14, y + 18):
        for xx in range(x - 24, x + 46):
            if 0 <= xx < SIZE and 0 <= yy < SIZE:
                r, g, b, a = img[yy][xx]
                img[yy][xx] = (min(255, r + 25), min(255, g + 25), min(255, b + 30), a)

raw = bytearray()
for row in img:
    raw.append(0)
    for pixel in row:
        raw.extend(pixel)


def chunk(tag, data):
    return (
        struct.pack('!I', len(data))
        + tag
        + data
        + struct.pack('!I', zlib.crc32(tag + data) & 0xFFFFFFFF)
    )

png = b'\x89PNG\r\n\x1a\n'
png += chunk(b'IHDR', struct.pack('!IIBBBBB', SIZE, SIZE, 8, 6, 0, 0, 0))
png += chunk(b'IDAT', zlib.compress(bytes(raw), 9))
png += chunk(b'IEND', b'')

with open('logo.png', 'wb') as f:
    f.write(png)

print('logo.png generated successfully')
