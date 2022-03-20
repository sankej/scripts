import time
import requests
import urllib3
import json
import datetime
import sys

from zzxc_utils import aes_encrypt_base64, get_str_sha1_secret_str, len_zh, Timer

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
    "getOrderList": "https://kylin.zhengzai.tv/kylin/order/list/unLimit?page=1&size=40",
}


class ZzxcDemo(object):
    def __init__(
        self,
        token,
        performanceId,
        ticketNums,
        ticketType,
        ppTokenList,
        barkTokenList,
        userName,
    ):
        self.session = requests.session()
        self.token = token
        self.performanceId = performanceId
        self.ticketNums = ticketNums
        self.ticketType = ticketType
        self.ppTokenList = ppTokenList
        self.barkTokenList = barkTokenList
        self.userName = userName
        pass

    def getEnterIdList(self):
        headers = commonHeaders | {
            "Host": "adam.zhengzai.tv",
            "Authorization": self.token,
        }
        enterIdList = []

        html = self.session.get(
            apis.get("getEnterIdList"), headers=headers, verify=False, cookies={}
        )

        try:
            for i in html.json().get("data"):
                enterIdList.append(i.get("entersId"))
        except:
            print(f"{self.userName} 没添加观影人")
            sys.exit(1)

        return '","'.join(enterIdList[: self.ticketNums])

    def genTicketData(self):
        headers = commonHeaders | {
            "Host": "kylin.zhengzai.tv",
            "Authorization": self.token,
            "source": "H5",
            "version": "1.1",
        }
        allTicketData = []

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
                "performanceName": showData.get("performancesInfo").get("title"),
                "title": singleTicket.get("title"),
                "ticketsId": singleTicket.get("ticketsId"),
                "isElectronic": singleTicket.get("isElectronic"),
                "isExpress": singleTicket.get("isExpress"),
                "expressType": singleTicket.get("expressType"),
                "timeId": singleTicket.get("timeId"),
                # status6能买  售罄 t.status=8  lackRegister!=1
                "isLackRegister": singleTicket.get("isLackRegister"),
            }
            allTicketData.append(baseResult)

        ticketData = allTicketData[self.ticketType]
        return ticketData

    def getOrderList(self):
        headers = commonHeaders | {
            "Host": "kylin.zhengzai.tv",
            "Authorization": self.token,
            "source": "H5",
            "version": "1.1",
        }

        html = self.session.get(
            apis.get("getOrderList"), headers=headers, verify=False, cookies={}
        )

        return html.json().get("data").get("list")

    def checkIsOrder(self, orderList):
        for order in orderList:
            if (
                order.get("performanceId") == self.performanceId
                and order.get("status") == 1
            ):
                return True
        return False

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
            content = html.json() | {"time": f"[start][{str(datetime.datetime.now())}]"}
            wechatNotice(
                json.dumps(content),
                self.ppTokenList,
                self.barkTokenList,
                logPrefix,
            )
            print(logPrefix, "抢票成功")
            sys.exit(0)
        else:
            print(logPrefix, html.json().get("message"))


def wechatNotice(content, ppTokenList, barkTokenList, logPrefix):
    title = f"{logPrefix} 抢票成功"
    for token in ppTokenList:
        url = "http://www.pushplus.plus/send"
        data = {
            "token": token,
            "title": title,
            "content": content,
            "template": "json",
        }
        requests.post(url=url, data=json.dumps(data), timeout=10)
    for token in barkTokenList:
        requests.post(
            url="https://bark-zza.tk/push",
            headers={
                "Content-Type": "application/json; charset=utf-8",
            },
            data=json.dumps(
                {
                    "body": "success",
                    "device_key": token,
                    "title": title,
                    "category": "ZZXC",
                    "group": "ZZXC",
                }
            ),
        )


def judgeStatus(t):
    return [
        "等待付款",
        "订单成功",
        "订单取消, 超时未支付/用户主动取消",
        "订单退款中",
        "已退款",
        "订单取消, 超时未支付/用户主动取消",
    ][t]


def showOrderList(orderList, logPrefix):
    if len(orderList) == 0:
        print(logPrefix, "没有订单")
        return

    print(logPrefix, "订单列表")

    for order in orderList:
        print(
            f'演出名字: {order.get("performanceTitle")}\n'
            f'演出ID: {order.get("performanceId")}\n'
            f'订单状态: {judgeStatus(int(order.get("status")))}\n'
            f'订单数量: {order.get("number")}\n'
            f'订单类型: {order.get("getTicketType")}\n'
        )


def start(
    token,
    performanceId,
    ticketNums,
    ticketType,
    startTime,
    ppTokenList,
    barkTokenList,
    userName,
    mode,
):
    ob = ZzxcDemo(
        token,
        performanceId,
        ticketNums,
        ticketType,
        ppTokenList,
        barkTokenList,
        userName,
    )
    ticketData = ob.genTicketData()
    enterIdList = ob.getEnterIdList()
    logPrefix = f"{userName.ljust(10 - len_zh(userName))} --- {ticketData.get('performanceName')}[{ticketData.get('title')}] ---"
    orderList = ob.getOrderList()

    if mode == "show":
        showOrderList(orderList, logPrefix)
        return

    if ob.checkIsOrder(orderList):
        print(logPrefix, "已经购买, 取消运行")
        sys.exit(0)

    print(logPrefix, "start")
    Timer().start(startTime, 0, logPrefix)

    while 1:
        ob.create_order(ticketData, enterIdList, logPrefix)
        time.sleep(0.3)
