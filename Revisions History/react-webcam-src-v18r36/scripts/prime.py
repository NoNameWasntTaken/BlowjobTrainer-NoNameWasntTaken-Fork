import pyfirmata2
import time
import sys

port = "/dev/cu.usbmodem142201"
board = pyfirmata2.Arduino(port)
out_pin = 9

prime_time = 3

if len(sys.argv) > 1:
    try:
        prime_time = float(sys.argv[1])
    except:
        print("Failed to convert arguement to float. Using default value (3 seconds).")
else:
    print("No arguement provided. Using default value (3 seconds).")

print("Starting.")
board.digital[out_pin].write(1)

time.sleep(prime_time)

board.digital[out_pin].write(0)
print("Done.")

'''

'''