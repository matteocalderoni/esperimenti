# simulazione/test_passo_2.py
import sys
import os
import time

# Determiniamo i percorsi delle cartelle in modo dinamico
current_dir = os.path.dirname(os.path.realpath(__file__))
project_root = os.path.dirname(current_dir)
mock_dir = os.path.join(project_root, "mock_hardware")

# Iniettiamo il percorso di 'mock_hardware' all'inizio dei percorsi di ricerca di Python
sys.path.insert(0, mock_dir)

print("=== TEST PASSO 2: ATTUATORI (generatore PWM(PCA9685), SERVO, MOTOR) ===")
try:
    from board import SCL, SDA
    import busio
    from adafruit_pca9685 import PCA9685
    from adafruit_motor import servo
    from adafruit_motor import motor

    # 1. Inizializzazione Bus I2C e controller PCA9685
    print("\n[TEST 1] Avvio chip e bus I2C...")
    i2c = busio.I2C(SCL, SDA)
    pwm = PCA9685(i2c, address=0x5f)
    pwm.frequency = 50

    # 2. Inizializzazione Servomotore
    print("\n[TEST 2] Inizializzazione Servomotore...")
    # Supponiamo che il servo sia collegato al canale 0 (es. Pan della testa del robot)
    servo_test = servo.Servo(pwm.channels[0], actuation_range=180)
    
    # Muoviamo il servo fittizio in diverse posizioni
    servo_test.angle = 90  # Centro
    servo_test.angle = 0   # Sinistra
    servo_test.angle = 180 # Destra
    servo_test.angle = 200 # Errore fuori range fittizio (verrà catturato dal warning)

    # 3. Inizializzazione Motore DC
    print("\n[TEST 3] Inizializzazione Motore DC...")
    # Supponiamo che il motore 1 (ruota anteriore sinistra) usi i canali PWM 15 e 14
    motor_test = motor.DCMotor(pwm.channels[15], pwm.channels[14])
    motor_test.decay_mode = motor.SLOW_DECAY

    # Simuliamo il movimento delle ruote
    print("\n[TEST 4] Test Trazione Motori...")
    motor_test.throttle = 1.0  # Spinta massima avanti
    motor_test.throttle = 0.5  # Spinta metà avanti
    motor_test.throttle = -0.5 # Retromarcia metà velocità
    motor_test.throttle = 0    # Stop motore

    # 4. Spegnimento
    print("\n[TEST 5] De-inizializzazione...")
    pwm.deinit()
    i2c.deinit()

    print("\n[TEST] RISULTATO: PASSO 2 COMPLETATO CON SUCCESSO!")
except Exception as e:
    print(f"\n[TEST ERROR] Fallimento durante il test: {e}")
