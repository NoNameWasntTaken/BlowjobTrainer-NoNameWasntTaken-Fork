import pyfirmata2
import time
import random

port = "/dev/cu.usbmodem142201"
board = pyfirmata2.Arduino(port)
out_pin = 9

IniCycle = random.randint(3,6)

LengthBurst = round(random.uniform(0.300, 0.401), 3)
LengthWait = LengthBurst - round(random.uniform(0.125, 0.186), 3)

DecayBurst = round(random.uniform(0.045, 0.076), 3)
DecayWait = DecayBurst + round(random.uniform(0.030, 0.051), 3)

StartDelay = round(random.uniform(0, 5), 3)

time.sleep(StartDelay)

for i in range(IniCycle):

    board.digital[out_pin].write(1)
    time.sleep(LengthBurst)

    board.digital[out_pin].write(0)
    time.sleep(LengthWait)

while(LengthBurst > 0.046):
    board.digital[out_pin].write(1)
    time.sleep(LengthBurst)

    board.digital[out_pin].write(0)
    time.sleep(LengthWait)

    LengthBurst -= DecayBurst
    LengthWait += DecayWait

'''

'''