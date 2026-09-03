# robot_server/vision/vlm_inspector.py
# Client VLM Open-Vocabulary Locale (Ollama Moondream) per Riconoscimento Generico di Oggetti ed Arredi
import requests

class VLMInspector:
    """
    Client VLM Open-Vocabulary per Riconoscimento Semantico Generico in Qualsiasi Ambiente.
    """
    def __init__(self, ollama_url="http://localhost:11434", model="moondream", timeout=10):
        self.ollama_url = ollama_url.rstrip('/')
        self.model = model
        self.timeout = timeout
        self.category_map = [
            {"id": "piano_cottura", "keys": ["stove", "cooktop", "sink", "faucet", "cucina", "lavello", "piano_cottura", "counter", "countertop", "oven", "range", "burner"], "display": "Piano Cottura / Lavello", "icon": "🍳", "type": "KITCHEN"},
            {"id": "frigorifero", "keys": ["refrigerator", "fridge", "frigorifero", "cooler", "freezer", "dispenser"], "display": "Frigorifero", "icon": "🧊", "type": "APPLIANCE"},
            {"id": "tavolo_pranzo", "keys": ["desk", "table", "dining", "tavolo", "scrivania", "board", "surface"], "display": "Tavolo / Scrivania", "icon": "🍽️", "type": "TABLE"},
            {"id": "credenza", "keys": ["cabinet", "bookcase", "shelf", "cupboard", "sideboard", "libreria", "mobile", "unit", "dresser", "stand", "chest"], "display": "Mobile / Credenza", "icon": "🗄️", "type": "STORAGE"},
            {"id": "penisola", "keys": ["island", "bar stool", "peninsula", "bancone", "sgabello", "bar"], "display": "Penisola / Bancone", "icon": "🍸", "type": "COUNTER"},
            {"id": "divano", "keys": ["sofa", "couch", "armchair", "bench", "divano", "poltrona"], "display": "Divano / Poltrona", "icon": "🛋️", "type": "SEATING"},
            {"id": "letto", "keys": ["bed", "mattress", "letto"], "display": "Letto", "icon": "🛏️", "type": "BED"},
            {"id": "sedia", "keys": ["chair", "stool", "sedia"], "display": "Sedia / Sgabello", "icon": "🪑", "type": "CHAIR"},
            {"id": "tv", "keys": ["tv", "television", "monitor", "screen", "schermo"], "display": "TV / Schermo", "icon": "📺", "type": "SCREEN"},
            {"id": "porta", "keys": ["door", "doorway", "entrance", "porta", "varco"], "display": "Porta / Ingresso", "icon": "🚪", "type": "DOOR"},
            {"id": "pianta", "keys": ["plant", "flower", "pianta"], "display": "Pianta", "icon": "🪴", "type": "PLANT"}
        ]
        self.catalog = self.category_map
        self.ignore_words = ["wall", "floor", "room", "render", "photo", "image", "urn", "space", "nothing", "background", "ground", "tile"]

    def is_available(self):
        try:
            r = requests.get(f"{self.ollama_url}/api/tags", timeout=1.5)
            return r.status_code == 200
        except Exception:
            return False

    def _match_category(self, raw_text):
        txt = raw_text.lower().strip()
        for cat in self.category_map:
            if any(k in txt for k in cat["keys"]):
                return cat
        return None

    def analyze_frame(self, base64_image_data):
        if not base64_image_data:
            return {"landmarks": [], "status": "no_image"}

        if ',' in base64_image_data:
            base64_image_data = base64_image_data.split(',', 1)[1]

        prompt_text = "Describe the main object or furniture in the center of this image in 2 to 4 words."
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
                            "status": "ok"
                        }
                return {"landmarks": [], "status": "unrecognized", "raw": raw_text}
        except requests.exceptions.RequestException as e:
            return {"landmarks": [], "status": "ollama_offline", "error": str(e)}

        return {"landmarks": [], "status": "empty"}
