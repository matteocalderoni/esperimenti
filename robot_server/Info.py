#!/usr/bin/env/python
# File name   : info.py
# Website     : www.Adeept.com
# Author      : Adeept
# Date		  : 2025/03/12
import psutil

def get_cpu_tempfunc():
    """ Return CPU temperature """
    mypath = "/sys/class/thermal/thermal_zone0/temp"
    try:
        with open(mypath, 'r') as mytmpfile:
            result = mytmpfile.read().strip()
        result = float(result) / 1000
        result = round(result, 1)
        return str(result)
    except Exception:
        return "50.0"


def get_gpu_tempfunc():
    """ Return GPU temperature as a character string"""
    try:
        res = os.popen('/opt/vc/bin/vcgencmd measure_temp').readline()
        return res.replace("temp=", "")
    except Exception:
        return "50.0'C"


def get_cpu_use():
    """ Return CPU usage using psutil"""
    cpu_cent = psutil.cpu_percent()
    return str(cpu_cent)


def get_ram_info():
    """ Return RAM usage using psutil """
    ram_cent = psutil.virtual_memory()[2]
    return str(ram_cent)


def get_swap_info():
    """ Return swap memory  usage using psutil """
    swap_cent = psutil.swap_memory()[3]
    return str(swap_cent)
