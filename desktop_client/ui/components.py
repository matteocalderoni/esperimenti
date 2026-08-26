# ui/components.py
from ui.info_panel import InfoPanel
from ui.control_panel import ControlPanel
from ui.sensor_panel import SensorPanel
from ui.slider_panel import SliderPanel
from ui.feature_panel import FeaturePanel

# Questo file funge da Facade (punto di accesso semplificato) per tutti i sotto-pannelli UI.
# In main.py importeremo direttamente questo modulo per costruire i vari widget.
