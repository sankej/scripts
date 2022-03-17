# import threading
from multiprocessing import Process
import json
from zzxc_order import start

profilePath = "/ql/config/zzxc.json"


def readProfileInfo():
    with open(profilePath, "r", encoding="utf8") as fp:
        users = json.load(fp)
    fp.close()
    return users


if __name__ == "__main__":
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
                    profile["sckeyList"],
                ),
            )
            processList.append(p)
            # p.setDaemon(True)
            p.start()
    for p in processList:
        p.join()

    print("end")
