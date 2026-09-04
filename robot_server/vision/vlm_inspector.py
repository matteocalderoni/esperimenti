import requests
import re

class VLMInspector:
    """
    Client VLM Open-Vocabulary per Riconoscimento Semantico Generico in Qualsiasi Ambiente.
    """
    def __init__(self, ollama_url="http://localhost:11434", model="moondream", timeout=10):
        self.ollama_url = ollama_url.rstrip('/')
        self.model = model
        self.timeout = timeout
        self.category_map = [
            {"id": "tavolo_pranzo", "keys": ["dining table", "kitchen table", "tabletop", "table top", "dining", "table", "tavolo", "tavolina", "tavolino", "tavola", "scrivania", "desk", "worktable", "coffee table", "dinner table", "eating table", "eating area", "dining room", "food table", "lunch table", "breakfast table", "wood table", "wooden table", "wooden surface", "wood surface", "table legs", "surface", "workstation"], "display": "Tavolo da Pranzo", "icon": "🍽️", "type": "TABLE"},
            {"id": "piano_cottura", "keys": ["cooktop", "stove", "sink", "faucet", "cucina", "lavello", "piano cottura", "countertop", "oven", "range", "burner", "kitchen counter", "kitchen sink"], "display": "Piano Cottura / Lavello", "icon": "🍳", "type": "KITCHEN"},
            {"id": "frigorifero", "keys": ["refrigerator", "fridge", "frigorifero", "cooler", "freezer", "frigo", "appliance", "cooling unit", "kitchen appliance", "tall unit", "cold box", "metallic appliance", "white appliance", "silver fridge"], "display": "Frigorifero", "icon": "🧊", "type": "APPLIANCE"},
            {"id": "credenza", "keys": ["sideboard", "credenza", "cabinet", "cupboard", "bookcase", "shelf", "libreria", "dresser", "shelf unit", "storage unit", "cassettiera"], "display": "Mobile / Credenza", "icon": "🗄️", "type": "STORAGE"},
            {"id": "penisola", "keys": ["kitchen island", "peninsula", "bar stool", "sgabello da bar", "bancone", "breakfast bar", "island"], "display": "Penisola / Bancone", "icon": "🍸", "type": "COUNTER"},
            {"id": "divano", "keys": ["sofa", "couch", "armchair", "divano", "poltrona", "canapè", "divanetto", "lounge", "seating unit", "living room sofa"], "display": "Divano / Poltrona", "icon": "🛋️", "type": "SEATING"},
            {"id": "letto", "keys": ["bed", "mattress", "letto", "lettino"], "display": "Letto", "icon": "🛏️", "type": "BED"},
            {"id": "sedia", "keys": ["chair", "stool", "sedia", "sgabello", "poltroncina", "seggiola", "seat", "seating", "bench", "panca"], "display": "Sedia / Sgabello", "icon": "🪑", "type": "CHAIR"},
            {"id": "tv", "keys": ["television", "tv", "monitor", "screen", "schermo", "display"], "display": "TV / Schermo", "icon": "📺", "type": "SCREEN"},
            {"id": "porta", "keys": ["doorway", "door", "entrance", "porta", "varco", "ingresso", "gate"], "display": "Porta / Ingresso", "icon": "🚪", "type": "DOOR"},
            {"id": "pianta", "keys": ["houseplant", "plant", "flower", "pianta", "vaso", "pot", "potted plant"], "display": "Pianta", "icon": "🪴", "type": "PLANT"}
        ]
        self.catalog = self.category_map

    def is_available(self):
        try:
            r = requests.get(f"{self.ollama_url}/api/tags", timeout=1.5)
            return r.status_code == 200
        except Exception:
            return False

    def _match_category(self, raw_text):
        txt = raw_text.lower().strip()
        # Passaggio 1: Verifica corrispondenza con limite di parola (\b)
        for cat in self.category_map:
            for k in cat["keys"]:
                pattern = r'\b' + re.escape(k) + r'\b'
                if re.search(pattern, txt):
                    return cat
        # Passaggio 2: Substring matching per frasi composte e variazioni morfologiche
        for cat in self.category_map:
            for k in cat["keys"]:
                if k in txt:
                    return cat
        return None

    def analyze_frame(self, base64_image_data):
        if not base64_image_data:
            return {"landmarks": [], "status": "no_image"}

        if ',' in base64_image_data:
            base64_image_data = base64_image_data.split(',', 1)[1]

        prompt_text = (
            "Identify the main object or furniture visible in this image. "
            "For example: dining table, desk, chair, sofa, bed, refrigerator, stove, cabinet, counter, or door. "
            "Output the concise object name."
        )
        payload = {
            "model": self.model,
            "prompt": prompt_text,
            "images": [base64_image_data],
            "stream": False
        }

        try:
            resp = requests.post(f"{self.ollama_url}/api/generate", json=payload, timeout=self.timeout)
            if resp.status_code == 200:
                raw_text = resp.json().get("response", "").strip()
                if raw_text:
                    cat = self._match_category(raw_text)
                    if cat:
                        return {
                            "landmarks": [{
                                "id": cat["id"],
                                "display": cat["display"],
                                "icon": cat["icon"],
                                "type": cat["type"],
                                "confidence": 0.95,
                                "description": raw_text
                            }],
                            "status": "ok",
                            "raw": raw_text
                        }
                return {"landmarks": [], "status": "unrecognized", "raw": raw_text}
        except requests.exceptions.RequestException as e:
            return {"landmarks": [], "status": "ollama_offline", "error": str(e)}

        return {"landmarks": [], "status": "empty"}

