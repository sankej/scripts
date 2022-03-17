# import threading
import os
import signal
import json

from multiprocessing import Process
from zzxc_order import start

profilePath = "/ql/config/zzxc.json"


def readProfileInfo():
    with open(profilePath, "r", encoding="utf8") as fp:
        users = json.load(fp)
    fp.close()
    return users

def term(sig_num, addtion):
    print(f"current pid is {os.getpid()}, group id is {os.getpgrp()}")
    os.killpg(os.getpgid(os.getpid()), signal.SIGKILL)

if __name__ == "__main__":
    signal.signal(signal.SIGTERM, term)
    processList = []
    profile = readProfileInfo()

    for user in profile["userList"]:
        for performanceId in user["performanceIdList"]:
            p = Process(
                target=start,
                args=(
                    user["token"],
                    performanceId,
                    int(user["ticketNums"]),
                    int(user["ticketType"]),
                    user["startTime"],
                    profile["ppTokenList"],
                ),
            )
            processList.append(p)
            # p.setDaemon(True)
            p.daemon = True
            p.start()

    for p in processList:
        p.join()

    print("end")
