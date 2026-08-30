# robot_server/vision/vlm_inspector.py
# Client VLM Locale (Ollama Moondream) per Riconoscimento Visivo Autentico di Mobili
import json
import requests

class VLMInspector:
    """
    Client per Vision-Language Model Locale (Ollama Moondream) per Riconoscimento Semantico Arredi Cucina.
    """
    def __init__(self, ollama_url="http://localhost:11434", model="moondream", timeout=10):
        self.ollama_url = ollama_url.rstrip('/')
        self.model = model
        self.timeout = timeout
        self.catalog = [
            {"id": "frigorifero", "name": "Frigorifero", "icon": "🧊", "keywords": ["refrigerator", "fridge", "water dispenser", "steel finish", "dispenser"]},
            {"id": "piano_cottura", "name": "Piano Cottura & Lavello", "icon": "🍳", "keywords": ["sink", "faucet", "cooktop", "stove", "countertop with sink"]},
            {"id": "tavolo_pranzo", "name": "Tavolo da Pranzo", "icon": "🍽️", "keywords": ["chair", "chairs", "dining", "four legs", "wood with four legs"]},
            {"id": "penisola_cucina", "name": "Penisola / Bancone", "icon": "🍸", "keywords": ["island", "bar stool", "island countertop", "peninsula", "stool"]},
            {"id": "credenza", "name": "Mobile Credenza", "icon": "🗄️", "keywords": ["cabinet", "plates", "sideboard", "cupboard", "wooden cabinet"]}
        ]

    def is_available(self):
        try:
            r = requests.get(f"{self.ollama_url}/api/tags", timeout=1.5)
            return r.status_code == 200
        except Exception:
            return False

    def analyze_frame(self, base64_image_data):
        if not base64_image_data:
            return {"landmarks": [], "status": "no_image"}

        if ',' in base64_image_data:
            base64_image_data = base64_image_data.split(',', 1)[1]

        payload = {
            "model": self.model,
            "prompt": "Describe this image in one short sentence.",
            "images": [base64_image_data],
            "stream": False
        }

        try:
            resp = requests.post(f"{self.ollama_url}/api/generate", json=payload, timeout=self.timeout)
            if resp.status_code == 200:
                raw_text = resp.json().get("response", "").lower()
                for item in self.catalog:
                    if any(kw in raw_text for kw in item["keywords"]):
                        return {
                            "landmarks": [{
                                "id": item["id"], "display": item["name"], "icon": item["icon"], "confidence": 0.94, "description": raw_text
                            }],
                            "status": "ok"
                        }
                return {"landmarks": [], "status": "unrecognized", "raw": raw_text}
        except requests.exceptions.RequestException as e:
            return {"landmarks": [], "status": "ollama_offline", "error": str(e)}

        return {"landmarks": [], "status": "empty"}
