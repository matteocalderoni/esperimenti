# utils/helpers.py
import math

def RGB_to_Hex(r, g, b):
    """Converte valori RGB (0-255) in una stringa esadecimale (es: #FF00FF)."""
    return f"#{r:02X}{g:02X}{b:02X}"

def rgb_to_hsv(r, g, b):
    """Converte valori RGB (0-255) in Lab/HSV compatibili con il tracciamento colore."""
    r, g, b = r / 255.0, g / 255.0, b / 255.0
    c_max = max(r, g, b)
    c_min = min(r, g, b)
    delta = c_max - c_min
    v = c_max
    
    if c_max == 0:
        s = 0
    else:
        s = delta / c_max
        
    if delta == 0:
        h = 0
    elif c_max == r:
        h = 60 * ((g - b) / delta) % 360
    elif c_max == g:
        h = 60 * ((b - r) / delta + 2)
    else:
        h = 60 * ((r - g) / delta + 4)
        
    if h < 0:
        h += 360
        
    h = int(round(h) / 2)
    s = int(s * 255)
    v = int(v * 255)
    return h, s, v
