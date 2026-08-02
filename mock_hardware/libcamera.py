# mock_hardware/libcamera.py

class Transform:
    def __init__(self, hflip=0, vflip=0):
        self.hflip = hflip
        self.vflip = vflip

class ColorSpace:
    @staticmethod
    def Sycc():
        return "Sycc"

    @staticmethod
    def Srgb():
        return "Srgb"
