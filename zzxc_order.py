import time
import requests
import urllib3
import json
import datetime
import sys

from notify import send
from zzxc_utils import aes_encrypt_base64, get_str_sha1_secret_str, Timer

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

commonHeaders = {
    "Connection": "keep-alive",
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://m.zhengzai.tv",
    "Referer": "https://m.zhengzai.tv/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36",
    "sec-ch-ua": '"Google Chrome";v="93", " Not;A Brand";v="99", "Chromium";v="93"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "Sec-Fetch-Site": "same-site",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "zh-CN,zh;q=0.9",
}
apis = {
    "getEnterIdList": "https://adam.zhengzai.tv/adam/enters/list",
    "getTicketData": "https://kylin.zhengzai.tv/kylin/performance/partner",
    "createOrder": "https://order.zhengzai.tv/order/order/pre",
}


class ZzxcDemo(object):
    def __init__(self, token, performanceId, ticketNums, ticketType, ppTokenList):
        self.session = requests.session()
        self.token = token
        self.performanceId = performanceId
        self.ticketNums = ticketNums
        self.ticketType = ticketType
        self.ppTokenList = ppTokenList
        pass

    def getEnterIdList(self):
        headers = commonHeaders | {
            "Host": "adam.zhengzai.tv",
            "Authorization": self.token,
        }
        cookies = {}
        enterIdList = []

        html = self.session.get(
            apis.get("getEnterIdList"), headers=headers, verify=False, cookies=cookies
        )

        for i in html.json().get("data"):
            enterIdList.append(i.get("entersId"))

        return '","'.join(enterIdList[: self.ticketNums])

    def genTicketData(self):
        headers = commonHeaders | {
            "Host": "kylin.zhengzai.tv",
            "Authorization": self.token,
            "source": "H5",
            "version": "1.1",
        }
        allData = []

        html = self.session.get(
            f"{apis.get('getTicketData')}/{self.performanceId}?isAgent=0",
            headers=headers,
            verify=False,
            cookies={},
        )
        showData = html.json().get("data")
        ticketList = showData.get("ticketTimesList")[0].get("ticketList")

        for singleTicket in ticketList:
            baseResult = {
                "title": singleTicket.get("title"),
                "ticketsId": singleTicket.get("ticketsId"),
                "isElectronic": singleTicket.get("isElectronic"),
                "isExpress": singleTicket.get("isExpress"),
                "expressType": singleTicket.get("expressType"),
                "timeId": singleTicket.get("timeId"),
                # status6能买  售罄 t.status=8  lackRegister!=1
                "isLackRegister": singleTicket.get("isLackRegister"),
            }
            allData.append(baseResult)

        ticketData = allData[self.ticketType]
        return ticketData

    def create_order(self, ticketData, enterIdList, logPrefix):
        headers = commonHeaders | {
            "Host": "order.zhengzai.tv",
            "Content-Length": "632",
            "Pragma": "no-cache",
            "Cache-Control": "no-cache",
            "Content-Type": "application/json;charset=UTF-8",
            "version": "1.1",
            "Authorization": self.token,
            "source": "H5",
        }
        data = (
            f'{{"number":{self.ticketNums},"ticketId":"{ticketData.get("ticketsId")}","isElectronic":{ticketData.get("isElectronic")},"enterIdList":["{str(enterIdList)}"],'
            f'"isExpress":0,"deviceFrom":"wap","actual":199,"performanceId":"{self.performanceId}",'
            f'"timeId":"{ticketData.get("timeId")}",'
            f'"returnUrl":"https://m.zhengzai.tv/#/pay/status?order_type=ticket&order_id=",'
            f'"showUrl":"https://m.zhengzai.tv/#/pay/status?order_type=ticket&order_id=",'
            f'"expressType":{ticketData.get("expressType")},"agentId":0,"payType":"alipay"}}'
        )
        encryptedData = aes_encrypt_base64(text=data)
        timeStamp = int(time.time() * 1000)
        sign = get_str_sha1_secret_str(
            encryptedData + str(timeStamp) + "QGZUanpSaSy9DEPQFVULJQ=="
        )
        data = {"sign": sign, "encryptedData": encryptedData, "timestamp": timeStamp}

        html = self.session.post(
            apis.get("createOrder"),
            headers=headers,
            verify=False,
            cookies={},
            data=json.dumps(data),
        )

        if "https://openapi.alipay.com/gateway" in html.text:
            wx_notice(
                f"[start][{str(datetime.datetime.now())}]" + html.text,
                str(enterIdList),
                self.ppTokenList,
            )
            print(logPrefix, "抢票成功")
            sys.exit(0)


def wx_notice(content, enterIdList, sckeyList):
    send(f"正在现场 --- {enterIdList}抢票成功", content)

    for key in sckeyList:
        url = "http://www.pushplus.plus/send"
        data = {
            "token": key,
            "title": f"{enterIdList}抢票成功",
            "content": content,
            "template": "html",
        }
        requests.post(url=url, data=json.dumps(data), timeout=10)


def start(token, performanceId, ticketNums, ticketType, startTime, ppTokenList):
    ob = ZzxcDemo(token, performanceId, ticketNums, ticketType, ppTokenList)
    ticketData = ob.genTicketData()
    enterIdList = ob.getEnterIdList()
    logPrefix = f"({enterIdList} --- {ticketData['title']}) ---"

    print(logPrefix, "start")
    Timer().start(startTime, 0, logPrefix)

    while 1:
        ob.create_order(ticketData, enterIdList, logPrefix)
        time.sleep(0.3)
