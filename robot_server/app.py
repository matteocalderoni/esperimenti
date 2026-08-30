#!/usr/bin/env/python
# File name   : app.py
# Website     : www.Adeept.com
# Author      : Adeept
# Date		  : 2025/03/12
from importlib import import_module
import os
from flask import Flask, render_template, Response, send_from_directory, request, jsonify
from flask_cors import *

from camera_opencv import Camera
import threading
from vision.vlm_inspector import VLMInspector

app = Flask(__name__)
CORS(app, supports_credentials=True)
camera = Camera()
vlm_service = VLMInspector(model='moondream')

def gen(camera):
    while True:
        frame = camera.get_frame()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/video_feed')
def video_feed():
    return Response(gen(camera),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/vlm_inspect', methods=['POST'])
def vlm_inspect_route():
    try:
        data = request.get_json(silent=True) or {}
        img_b64 = data.get('image', '')
        res = vlm_service.analyze_frame(img_b64)
        return jsonify(res)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e), "landmarks": []})

dir_path = os.path.dirname(os.path.realpath(__file__))

@app.route('/api/img/<path:filename>')
def sendimg(filename):
    return send_from_directory(dir_path+'/dist/img', filename)

@app.route('/js/<path:filename>')
def sendjs(filename):
    return send_from_directory(dir_path+'/dist/js', filename)

@app.route('/css/<path:filename>')
def sendcss(filename):
    return send_from_directory(dir_path+'/dist/css', filename)

@app.route('/api/img/icon/<path:filename>')
def sendicon(filename):
    return send_from_directory(dir_path+'/dist/img/icon', filename)

@app.route('/fonts/<path:filename>')
def sendfonts(filename):
    return send_from_directory(dir_path+'/dist/fonts', filename)

sim_dir_path = os.path.realpath(os.path.join(dir_path, '../../../../../simulazione/web_simulator'))
if not os.path.exists(sim_dir_path):
    sim_dir_path = '/Users/mauroi/Documents/esperimenti/simulazione/web_simulator'

@app.route('/simulator')
@app.route('/simulator/')
def simulator():
    if os.path.exists(os.path.join(sim_dir_path, 'index.html')):
        return send_from_directory(sim_dir_path, 'index.html')
    return send_from_directory(sim_dir_path, 'simulator.html')

@app.route('/simulator/<path:filename>')
def send_simulator_file(filename):
    return send_from_directory(sim_dir_path, filename)

@app.route('/<path:filename>')
def sendgen(filename):
    return send_from_directory(dir_path+'/dist', filename)

@app.route('/')
def index():
    return send_from_directory(dir_path+'/dist', 'index.html')

class webapp:
    def __init__(self):
        self.camera = camera

    def modeselect(self, modeInput):
        Camera.modeSelect = modeInput

    def colorFindSet(self, H, S, V):
        camera.colorFindSet(H, S, V)

    def thread(self):
        app.run(host='0.0.0.0', port=5000,threaded=True)

    def startthread(self):
        fps_threading=threading.Thread(target=self.thread)             
        fps_threading.daemon = False
        fps_threading.start()           


if __name__ == "__main__":
    WEB = webapp()
    try:
        WEB.startthread()
    except:
        print("exit")