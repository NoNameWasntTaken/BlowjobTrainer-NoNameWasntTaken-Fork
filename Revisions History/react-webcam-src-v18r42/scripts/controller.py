import os
import random
import signal
import sys
import time
import pyfirmata2

PORT = "/dev/cu.usbmodem142201"
FIFO_PATH = "/tmp/trainer.fifo"
READY_PATH = "/tmp/trainer.ready"
OUT_PIN = 9

board = None


def prime(board, prime_time=3.0):
    print("Starting.")
    board.digital[OUT_PIN].write(1)
    time.sleep(prime_time)
    board.digital[OUT_PIN].write(0)
    print("Done.")


def burst(board):
    ini_cycle = random.randint(3, 6)
    length_burst = round(random.uniform(0.300, 0.401), 3)
    length_wait = length_burst - round(random.uniform(0.125, 0.186), 3)
    decay_burst = round(random.uniform(0.045, 0.076), 3)
    decay_wait = decay_burst + round(random.uniform(0.030, 0.051), 3)
    start_delay = round(random.uniform(1, 5), 3)

    time.sleep(start_delay)

    for _ in range(ini_cycle):
        board.digital[OUT_PIN].write(1)
        time.sleep(length_burst)
        board.digital[OUT_PIN].write(0)
        time.sleep(length_wait)

    while length_burst > 0.046:
        board.digital[OUT_PIN].write(1)
        time.sleep(length_burst)
        board.digital[OUT_PIN].write(0)
        time.sleep(length_wait)
        length_burst -= decay_burst
        length_wait += decay_wait


def handle_line(line):
    parts = line.strip().split()
    if not parts:
        return
    cmd = parts[0].lower()
    if cmd == "prime":
        seconds = float(parts[1]) if len(parts) > 1 else 3.0
        prime(board, seconds)
    elif cmd == "burst":
        burst(board)
    elif cmd in ("quit", "exit"):
        sys.exit(0)
    else:
        print(f"unknown command: {cmd}")


def main():
    global board
    if not os.path.exists(FIFO_PATH):
        os.mkfifo(FIFO_PATH)

    print(f"Connecting to {PORT}...", flush=True)
    board = pyfirmata2.Arduino(PORT)
    print("Connected. Listening for commands.", flush=True)
    with open(READY_PATH, "w") as ready:
        ready.write("ready\n")

    fd = os.open(FIFO_PATH, os.O_RDWR)
    fifo = os.fdopen(fd, "r")

    while True:
        line = fifo.readline()
        if not line:
            continue
        try:
            handle_line(line)
        except Exception as e:
            print(f"command failed: {e}")


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
    try:
        main()
    finally:
        try:
            os.unlink(READY_PATH)
        except OSError:
            pass
        if board is not None:
            board.exit()
