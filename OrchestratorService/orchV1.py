from flask import *
import json
import requests
import pprint
import docker
import time
import progressbar
import os
import timeinterval
from threading import Thread
import math
import sys
import signal
import flask

startTime = 0
roundRobin = -1
requestCounter = 0

lock = False

# parse
import xml.etree.ElementTree as ET
tree = ET.parse('test.xml')
root = tree.getroot()
genVariables = {}
for child in root:
    genVariables[child.tag]=child.text
    print(child.tag,child.text)


print(genVariables)


app = Flask(__name__)


client = docker.DockerClient(base_url='unix://var/run/docker.sock')
client1 = docker.APIClient(base_url='unix://var/run/docker.sock')

print('Starting Orchestrator = > ')

client.containers.run(genVariables['db-container'],ports={'3306/tcp': 3306},detach=True) #start the mysql container
bar = progressbar.ProgressBar(maxval=30, \
    widgets=[progressbar.Bar('=', '[', ']'), ' ', progressbar.Percentage()])
bar.start()
for i in range(30):
    bar.update(i+1)
    time.sleep(1)
bar.finish()
client.containers.run(genVariables['main-container'],ports={'8000/tcp': genVariables['start-port']},detach=True) #start only one acts container initially


time.sleep(3)

# print(requests.get('http://127.0.0.1:8000/api/v1/_health').status_code)

# for container in client.containers.list():
#     port_data = client1.inspect_container(container.short_id)['NetworkSettings']['Ports']
#     if '8000/tcp' in port_data:
#         # print(port_data['8000/tcp'][0]['HostPort'])
#         ports.append(port_data['8000/tcp'][0]['HostPort'])

def getActivePorts():
        portsList = []
        for container in client.containers.list():
                port_data = client1.inspect_container(container.short_id)['NetworkSettings']['Ports']
                if '8000/tcp' in port_data:
                        portsList.append(port_data['8000/tcp'][0]['HostPort'])
        portsList.reverse()
        return portsList


@app.route("/api/v1/<path:path>", methods=['GET'])
def loadBalancer(path):
    global roundRobin
    global requestCounter
    ports = getActivePorts()
    print(ports)
    if requestCounter==1:
            global startTime
            startTime = time.time()
    requestCounter = requestCounter+1
    roundRobin =  roundRobin+1
    roundRobin = roundRobin%len(ports)
    print(roundRobin)
    r = requests.get('http://localhost:'+ports[roundRobin]+'/api/v1/'+path,json=request.json)
    try:
        obj = r.json()
    except:
            obj={}
 
    return jsonify(obj),r.status_code



@app.route("/api/v1/<path:path>", methods=['POST'])
def loadBalancer2(path):
    global roundRobin
    global requestCounter
    ports = getActivePorts()
    print(ports)
    if requestCounter==1:
            global startTime
            startTime = time.time()
    requestCounter = requestCounter+1
    roundRobin =  roundRobin+1
    roundRobin = roundRobin%len(ports)
    print(roundRobin)
    r = requests.post('http://localhost:'+ports[roundRobin]+'/api/v1/'+path,json=request.json)

    try:
        obj = r.json()
    except:
            obj={}
 
    return jsonify(obj),r.status_code

@app.route("/api/v1/<path:path>", methods=['DELETE'])
def loadBalancer3(path):
    global roundRobin
    global requestCounter
    ports = getActivePorts()
    print(ports)
    if requestCounter==1:
            global startTime
            startTime = time.time()
    requestCounter = requestCounter+1
    roundRobin =  roundRobin+1
    roundRobin = roundRobin%len(ports)
    print(roundRobin)
    r = requests.delete('http://localhost:'+ports[roundRobin]+'/api/v1/'+path,json=request.json)

    try:
        obj = r.json()
    except:
            obj={}
 
    return jsonify(obj),r.status_code
#     if(flask.request.method=='POST'):
#             return requests.post('http://localhost:'+ports[roundRobin]+'/api/v1/'+route,json=data).status_code
#     elif(flask.request.method=='DELETE'):
#             return requests.delete('http://localhost:'+ports[roundRobin]+'/api/v1/'+route).status_code
#     else:


def healthCheck():
        containerState = {}
        ports = getActivePorts()
        for port in ports:
                responseCode = requests.get('http://localhost:'+port+'/api/v1/_health').status_code
                containerState[port]=responseCode
        return containerState



def stopContainer(portNumber):
        global lock
        for container in client.containers.list():
                port_data = client1.inspect_container(container.short_id)['NetworkSettings']['Ports']
                if '8000/tcp' in port_data:
                        if port_data['8000/tcp'][0]['HostPort'] == portNumber:
                                lock = True
                                print('container running on port: ' + portNumber + ' stopped successfully')
                                container.stop()
                                time.sleep(3)
                                lock = False
        
       
              
def startContainer(portNumber):
        global lock
        print('starting container on port: ' + portNumber)
        lock = True
        client.containers.run('abhin99/acts',ports={'8000/tcp': portNumber},detach=True)
        time.sleep(3)    
        lock = False
        print('container running on port: ' + portNumber + ' started successfully')




def faultTolerance():
        # print('called faultTolerance')
        while True:
                global lock
                if lock==False:
                        containerState = healthCheck()
                        for port,statusCode in containerState.items():
                                if statusCode==500:
                                        print('container running on port: ' + port+' is dead')
                                        stopContainer(port)
                                        startContainer(port)
                time.sleep(int(genVariables['heartbeat']))


def trackRequests():
        global requestCounter
        global startTime

        endTime = time.time()-startTime
        # print(startTime%60)
        # print(endTime%60)
        if endTime>=float(genVariables['timer-duration']):
                requestCounter=0
        return requestCounter


def autoScaling():
        while True:
                req = trackRequests()
                print("Total requests: "+str(req))
                reqContainers = math.floor((req/20)+1)
                print("required containers: "+str(reqContainers))
                ports = getActivePorts()
                if reqContainers<len(ports):  #scale Down
                        print("Scaling Down")
                        ports.reverse()
                        stopLen = len(ports)-reqContainers
                        for i in range(0,stopLen):
                                stopContainer(ports[i])
                
                elif reqContainers>len(ports):  #scale Up
                        print("Scaling Up")
                        extraLen = reqContainers-len(ports)
                        newPorts = []
                        for i in range(1,extraLen+1):
                                temp = str((int)(ports[len(ports)-1])+i)
                                newPorts.append(temp)
                        for j in range(0,len(newPorts)):
                                startContainer(str(newPorts[j]))


                time.sleep(float(genVariables['timer-duration']))
        

def stopAllContainers():
        print('Stopping All Running Containers and Exiting')
        for container in client.containers.list():
                container.stop()


# stopContainer('8000')

# stopper = timeinterval.start(1,faultTolerance)


faultTolerance_thread = Thread(target=faultTolerance)
faultTolerance_thread.start()

autoScaling_thread = Thread(target=autoScaling)
autoScaling_thread.start()

def handler(signal, frame):
        stopAllContainers()
        sys.exit(0)


if __name__ == '__main__':
        app.run(host='0.0.0.0', port=80)
        signal.signal(signal.SIGINT, handler)
        signal.pause()
# test = healthCheck()
# print(test)
 
