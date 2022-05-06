# import threading
import os
import signal
import json
import argparse

from multiprocessing import Process
from zzxc_order import start

profilePath = "/ql/data/config/zzxc.json"
parser = argparse.ArgumentParser(description="Test for argparse")
parser.add_argument("--mode", "-m", help="运行模式，默认为抢票, show为查询订单", default="order")
args = parser.parse_args()


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
                    profile["barkTokenList"],
                    user["userName"],
                    args.mode,
                ),
            )
            processList.append(p)
            # p.setDaemon(True)
            p.daemon = True
            p.start()

            if args.mode == "show":
                break

    for p in processList:
        p.join()

    print("end")