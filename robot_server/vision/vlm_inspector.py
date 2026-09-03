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
            {"keys": ["sofa", "couch", "armchair", "bench", "divano", "poltrona"], "display": "Divano / Poltrona", "icon": "🛋️", "type": "SEATING"},
            {"keys": ["bed", "mattress", "letto"], "display": "Letto", "icon": "🛏️", "type": "BED"},
            {"keys": ["desk", "table", "dining", "tavolo", "scrivania"], "display": "Tavolo / Scrivania", "icon": "🍽️", "type": "TABLE"},
            {"keys": ["chair", "stool", "sedia", "sgabello"], "display": "Sedia / Sgabello", "icon": "🪑", "type": "CHAIR"},
            {"keys": ["cabinet", "bookcase", "shelf", "cupboard", "sideboard", "libreria", "mobile"], "display": "Mobile / Libreria", "icon": "🗄️", "type": "STORAGE"},
            {"keys": ["tv", "television", "monitor", "screen", "schermo"], "display": "TV / Schermo", "icon": "📺", "type": "SCREEN"},
            {"keys": ["door", "doorway", "entrance", "porta", "varco"], "display": "Porta / Ingresso", "icon": "🚪", "type": "DOOR"},
            {"keys": ["plant", "flower", "pianta"], "display": "Pianta", "icon": "🪴", "type": "PLANT"},
            {"keys": ["refrigerator", "fridge", "frigorifero"], "display": "Frigorifero", "icon": "🧊", "type": "APPLIANCE"},
            {"keys": ["stove", "cooktop", "sink", "faucet", "cucina", "lavello", "piano_cottura"], "display": "Piano Cottura / Lavello", "icon": "🍳", "type": "KITCHEN"}
        ]
        self.catalog = [{"id": c["keys"][-1], "name": c["display"], "icon": c["icon"], "keywords": c["keys"]} for c in self.category_map]

    def is_available(self):
        try:
            r = requests.get(f"{self.ollama_url}/api/tags", timeout=1.5)
            return r.status_code == 200
        except Exception:
            return False

    def _match_category(self, raw_text):
        txt = raw_text.lower()
        for cat in self.category_map:
            if any(k in txt for k in cat["keys"]):
                return cat
        clean_title = raw_text.strip().capitalize()[:30]
        return {"display": clean_title, "icon": "📦", "type": "GENERIC"}

    def analyze_frame(self, base64_image_data):
        if not base64_image_data:
            return {"landmarks": [], "status": "no_image"}

        if ',' in base64_image_data:
            base64_image_data = base64_image_data.split(',', 1)[1]

        prompt_text = "What main object, furniture, or architectural feature is in the center foreground of this image? Output only the concise object name."
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
                    return {
                        "landmarks": [{
                            "id": cat["display"].lower().replace(' ', '_'),
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
