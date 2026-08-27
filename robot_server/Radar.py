# robot_server/Radar.py
import time
import Ultra as ultra

class Radar:
    def __init__(self, sc_gear):
        self.sc_gear = sc_gear

    def scan(self):
        pwm0_min = -90
        pwm0_max = 90
        scan_speed = 2
        result = []

        pwm0_pos = pwm0_max
        self.sc_gear.moveAngle(0, 0)
        time.sleep(0.8)
        while pwm0_pos > pwm0_min:
            pwm0_pos -= scan_speed
            self.sc_gear.moveAngle(0, pwm0_pos)
            dist = ultra.checkdist()
            if dist > 200:
                continue
            theta = 90 - pwm0_pos
            result.append([dist, theta])
            time.sleep(0.02)
    
        self.sc_gear.set_angle(0, 90)
        return result
