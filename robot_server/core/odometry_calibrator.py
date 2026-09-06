# robot_server/core/odometry_calibrator.py
import json
import os
import time

CALIBRATION_FILE = os.path.join(os.path.dirname(__file__), 'calibration_data.json')

DEFAULT_CALIBRATION = {
    "linear_speed_cm_s": 25.0,     # Velocità rettilinea stimata a PWM 40
    "angular_speed_deg_s": 90.0,   # Velocità angolare stimata a PWM 40
    "calibration_voltage": 7.4,    # Voltaggio batteria di riferimento (V)
    "pwm_default": 40
}

def load_calibration():
    if os.path.exists(CALIBRATION_FILE):
        try:
            with open(CALIBRATION_FILE, 'r') as f:
                data = json.load(f)
                return {**DEFAULT_CALIBRATION, **data}
        except Exception as e:
            print(f"⚠️ Errore lettura calibrazione ({e}), uso valori predefiniti.")
    return DEFAULT_CALIBRATION.copy()

def save_calibration(data):
    try:
        with open(CALIBRATION_FILE, 'w') as f:
            json.dump(data, f, indent=4)
        print(f"✅ Calibrazione salvata in {CALIBRATION_FILE}")
    except Exception as e:
        print(f"❌ Errore salvataggio calibrazione: {e}")

def get_voltage_compensation(current_voltage, base_voltage):
    if not current_voltage or current_voltage <= 0 or not base_voltage or base_voltage <= 0:
        return 1.0
    factor = base_voltage / current_voltage
    return max(0.7, min(1.4, factor))

def run_calibration_wizard():
    print("=" * 60)
    print(" 🚗 WIZARD DI CALIBRAZIONE ODOMETRIA PER SMART CAR 4WD 🚗")
    print("=" * 60)
    print("Assicurati che la macchina si trovi su un pavimento libero.")
    
    cal_data = load_calibration()

    try:
        from robot_server.Voltage import Voltage
        v_sensor = Voltage()
        v_sensor.setup()
        v_curr = v_sensor.get_vin()
        print(f"🔋 Voltaggio batteria attuale rilevato: {v_curr:.2f} V")
        cal_data["calibration_voltage"] = round(v_curr, 2)
    except Exception:
        print("ℹ️ Sensore voltaggio non disponibile o in mock mode. Usato 7.4V.")

    print("\n--- PASSO 1: Calibrazione Avanzamento Lineare (1 Metro) ---")
    val = input(f"Inserisci la velocità rettilinea misurata in cm/s (attuale: {cal_data['linear_speed_cm_s']} cm/s) [Invio per mantenere]: ")
    if val.strip():
        try:
            cal_data["linear_speed_cm_s"] = float(val)
        except ValueError:
            pass

    print("\n--- PASSO 2: Calibrazione Rotazione in Place (360 Gradi) ---")
    val = input(f"Inserisci la velocità angolare misurata in deg/s (attuale: {cal_data['angular_speed_deg_s']} deg/s) [Invio per mantenere]: ")
    if val.strip():
        try:
            cal_data["angular_speed_deg_s"] = float(val)
        except ValueError:
            pass

    save_calibration(cal_data)
    print("\n✅ Wizard completato con successo!")

if __name__ == "__main__":
    run_calibration_wizard()
