# robot_server/vision/vlm_inspector.py
import json
import requests

class VLMInspector:
    """
    Client per Vision-Language Model Locale (Ollama) per Riconoscimento Landmark e Correzione Odometrica.
    """
    def __init__(self, ollama_url="http://localhost:11434", model="llava:7b", timeout=5):
        self.ollama_url = ollama_url.rstrip('/')
        self.model = model
        self.timeout = timeout
        self.known_landmarks = {
            "porta_rossa": {"world_pos": (200, 30), "type": "exit"},
            "quadro_blu": {"world_pos": (500, 30), "type": "wall_art"},
            "pallina_verde": {"world_pos": (350, 90), "type": "target"},
            "faro_giallo": {"world_pos": (580, 100), "type": "beacon"}
        }

    def is_available(self):
        try:
            r = requests.get(f"{self.ollama_url}/api/tags", timeout=1.5)
            return r.status_code == 200
        except Exception:
            return False

    def analyze_frame(self, base64_image_data):
        """
        Invia il frame a Ollama richiedendo un output JSON con i landmark riconosciuti.
        """
        if not base64_image_data:
            return {"landmarks": [], "status": "no_image"}

        # Rimuove l'eventuale header 'data:image/jpeg;base64,'
        if ',' in base64_image_data:
            base64_image_data = base64_image_data.split(',', 1)[1]

        prompt = (
            "Analyze this robot camera view. Identify any visible landmarks from: "
            "'porta_rossa', 'quadro_blu', 'pallina_verde', 'faro_giallo'. "
            "Respond ONLY with a JSON object: {\"landmarks\": [{\"name\": \"...\", \"direction\": \"left/center/right\"}]}"
        )

        payload = {
            "model": self.model,
            "prompt": prompt,
            "images": [base64_image_data],
            "stream": False,
            "format": "json"
        }

        try:
            resp = requests.post(f"{self.ollama_url}/api/generate", json=payload, timeout=self.timeout)
            if resp.status_code == 200:
                data = resp.json()
                raw_response = data.get("response", "{}")
                parsed = json.loads(raw_response)
                return {"landmarks": parsed.get("landmarks", []), "status": "ok"}
        except requests.exceptions.RequestException:
            # Fallback resiliente: Ollama offline o occupato
            return {"landmarks": [], "status": "ollama_offline"}
        except json.JSONDecodeError:
            return {"landmarks": [], "status": "parse_error"}

        return {"landmarks": [], "status": "empty"}
