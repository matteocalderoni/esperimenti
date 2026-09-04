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
            {"id": "tavolo_pranzo", "keys": ["dining table", "kitchen table", "dining", "table", "tavolo", "scrivania", "desk"], "display": "Tavolo da Pranzo", "icon": "🍽️", "type": "TABLE"},
            {"id": "piano_cottura", "keys": ["cooktop", "stove", "sink", "faucet", "cucina", "lavello", "piano cottura", "countertop", "oven", "range", "burner"], "display": "Piano Cottura / Lavello", "icon": "🍳", "type": "KITCHEN"},
            {"id": "frigorifero", "keys": ["refrigerator", "fridge", "frigorifero", "cooler", "freezer"], "display": "Frigorifero", "icon": "🧊", "type": "APPLIANCE"},
            {"id": "credenza", "keys": ["sideboard", "credenza", "cabinet", "cupboard", "bookcase", "shelf", "libreria", "dresser"], "display": "Mobile / Credenza", "icon": "🗄️", "type": "STORAGE"},
            {"id": "penisola", "keys": ["kitchen island", "peninsula", "bar stool", "bancone", "sgabello", "breakfast bar"], "display": "Penisola / Bancone", "icon": "🍸", "type": "COUNTER"},
            {"id": "divano", "keys": ["sofa", "couch", "armchair", "divano", "poltrona"], "display": "Divano / Poltrona", "icon": "🛋️", "type": "SEATING"},
            {"id": "letto", "keys": ["bed", "mattress", "letto"], "display": "Letto", "icon": "🛏️", "type": "BED"},
            {"id": "sedia", "keys": ["chair", "stool", "sedia"], "display": "Sedia / Sgabello", "icon": "🪑", "type": "CHAIR"},
            {"id": "tv", "keys": ["television", "tv", "monitor", "screen", "schermo"], "display": "TV / Schermo", "icon": "📺", "type": "SCREEN"},
            {"id": "porta", "keys": ["doorway", "door", "entrance", "porta", "varco"], "display": "Porta / Ingresso", "icon": "🚪", "type": "DOOR"},
            {"id": "pianta", "keys": ["houseplant", "plant", "flower", "pianta"], "display": "Pianta", "icon": "🪴", "type": "PLANT"}
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
        for cat in self.category_map:
            for k in cat["keys"]:
                pattern = r'\b' + re.escape(k) + r'\b'
                if re.search(pattern, txt):
                    return cat
        return None

    def analyze_frame(self, base64_image_data):
        if not base64_image_data:
            return {"landmarks": [], "status": "no_image"}

        if ',' in base64_image_data:
            base64_image_data = base64_image_data.split(',', 1)[1]

        prompt_text = (
            "What main object or furniture is in the center of this image? "
            "Choose from: dining table, refrigerator, stove, cabinet, peninsula, sofa, bed, door, chair. "
            "Output only the concise object name."
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

