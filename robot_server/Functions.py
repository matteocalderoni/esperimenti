#!/usr/bin/env python3
# File name   : Functions.py
# Description : Control Functions Orchestrator
# Author      : Adeept (Refactored)
# Date        : 2026/08/27

import time
import threading
import os
from gpiozero import InputDevice

import Move as move
import RPIservo
from ADS7830 import ADS7830
from Radar import Radar

# Import Behaviors
from behaviors.line_tracker import LineTrackerBehavior
from behaviors.light_tracker import LightTrackerBehavior
from behaviors.obstacle_avoider import ObstacleAvoiderBehavior
from behaviors.distance_keeper import DistanceKeeperBehavior
from behaviors.room_explorer import RoomExplorerBehavior

# Compatibility Globals
last_status = None
lightADC = 127
lightThreshold = 15

scGear = RPIservo.ServoCtrl()
scGear.start()

move.setup()

curpath = os.path.realpath(__file__)
thisPath = "/" + os.path.dirname(curpath)

pwm0_direction = 1
pwm0_init = RPIservo.init_pwm0
pwm0_max = 180
pwm0_min = 0
pwm0_pos = pwm0_init

adc = ADS7830()

# Pins configuration
line_pin_left = 22
line_pin_middle = 27
line_pin_right = 17

track_line_left = None
track_line_middle = None
track_line_right = None

class Functions(threading.Thread):
    def __init__(self, *args, **kwargs):
        super(Functions, self).__init__(*args, **kwargs)
        self.functionMode = 'none'
        self.steadyGoal = 0

        self.scanNum = 3
        self.scanList = [0, 0, 0]
        self.scanPos = 1
        self.scanDir = 1
        self.rangeKeep = 0.7
        self.scanRange = 100
        self.scanServo = 1
        self.turnServo = 2
        self.turnWiggle = 200

        self.__flag = threading.Event()
        self.__flag.clear()

        # Expose dependencies
        self.scGear = scGear
        self.adc = adc
        
        self.behaviors = {
            'automatic': ObstacleAvoiderBehavior(self),
            'trackLine': LineTrackerBehavior(self),
            'trackLight': LightTrackerBehavior(self, self.adc),
            'keepDistance': DistanceKeeperBehavior(self, self.distRedress),
            'exploration': RoomExplorerBehavior(self)
        }
        self.radar = Radar(scGear)

    def pwmGenOut(self, angleInput):
        return int(angleInput)

    def setup(self):
        global track_line_left, track_line_middle, track_line_right
        track_line_left = InputDevice(pin=line_pin_left)
        track_line_middle = InputDevice(pin=line_pin_middle)
        track_line_right = InputDevice(pin=line_pin_right)
        
        self.track_line_left = track_line_left
        self.track_line_middle = track_line_middle
        self.track_line_right = track_line_right
        
        for behavior in self.behaviors.values():
            behavior.setup()

    def radarScan(self):
        return self.radar.scan()

    def pause(self):
        self.functionMode = 'none'
        move.motorStop()
        self.__flag.clear()

    def resume(self):
        self.__flag.set()

    def automatic(self):
        self.functionMode = 'automatic'
        self.resume()

    def trackLine(self):
        self.functionMode = 'trackLine'
        self.resume()

    def trackLight(self):
        self.functionMode = 'trackLight'
        self.resume()

    def keepDistance(self):
        self.functionMode = 'keepDistance'
        self.resume()

    def exploration(self):
        self.functionMode = 'exploration'
        self.resume()

    def steady(self, goalPos):
        self.functionMode = 'Steady'
        self.steadyGoal = goalPos
        self.resume()

    def distRedress(self):
        return self.behaviors['automatic'].dist_redress()

    def functionGoing(self):
        if self.functionMode == 'none':
            self.pause()
        elif self.functionMode in self.behaviors:
            global last_status
            last_status = self.behaviors[self.functionMode].process(last_status)

    def run(self):
        while 1:
            self.__flag.wait()
            self.functionGoing()
