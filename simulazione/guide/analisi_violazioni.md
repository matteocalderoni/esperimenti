# Analisi Violazioni Costituzione (Regola 1)

In base all'analisi effettuata sull'intera base di codice, i seguenti file non rispettano la **Regola 1** della Costituzione (limite di 150 righe). 

Si nota che **tutte le violazioni appartengono al codice originale Adeept** fornito dal produttore, mentre le nostre cartelle custom (`mock_hardware/` e `simulazione/`) rispettano già al 100% il limite!

## 🔴 File da rifattorizzare (Server e App)
| File | Righe |
| :--- | :--- |
| `Server_MecanumWheels/WebServer.py` | 557 |
| `Server_OrdinaryWheels/WebServer.py` | 542 |
| `Server_MecanumWheels/GUIServer.py` | 506 |
| `Server_OrdinaryWheels/GUIServer.py` | 493 |
| `Server_MecanumWheels/camera_opencv.py` | 495 |
| `Server_OrdinaryWheels/camera_opencv.py` | 495 |
| `Server_MecanumWheels/FPV.py` | 422 |
| `Server_OrdinaryWheels/FPV.py` | 422 |
| `Server_MecanumWheels/RobotLight.py` | 330 |
| `Server_OrdinaryWheels/RobotLight.py` | 330 |
| `Server_MecanumWheels/Functions.py` | 306 |
| `Server_OrdinaryWheels/Functions.py` | 306 |
| `Server_MecanumWheels/RPIservo.py` | 290 |
| `Server_OrdinaryWheels/RPIservo.py` | 290 |
| `Server_MecanumWheels/Move.py` | 168 |

## 🔴 Altri file (Client e Setup)
| File | Righe |
| :--- | :--- |
| `Client_MecanumWheels/GUI.py` | 1121 |
| `Client_OrdinaryWheels/GUI.py` | 1070 |
| `setup_OrdinaryWheels.py` | 252 |
| `setup_MecanumWheels.py` | 252 |
| `Examples/05_WS2812/FlowingLights.py` | 369 |
| `Examples/05_WS2812/BreathingLight.py` | 292 |

---
**Nota per lo sviluppo**: Prima di aggiungere nuove funzionalità a questi script, sarà necessario dividerli (ad esempio separando la logica WebSocket, la gestione della fotocamera e l'hardware in file separati) per conformarli alla Costituzione.
