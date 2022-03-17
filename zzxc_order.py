#!/usr/bin/python
# -*- coding: UTF-8 -*-
import time
import requests
import urllib3
import json

from notify import send
from zzxc_utils import aes_encrypt_base64, get_str_sha1_secret_str, Timer
import datetime

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


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
        url = "https://adam.zhengzai.tv/adam/enters/list"
        headers = {
            "Host": "adam.zhengzai.tv",
            "Connection": "keep-alive",
            "sec-ch-ua": '" Not A;Brand";v="99", "Chromium";v="98", "Google Chrome";v="98"',
            "Accept": "application/json, text/plain, */*",
            "Authorization": self.token,
            "sec-ch-ua-mobile": "?0",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36",
            "sec-ch-ua-platform": '"Windows"',
            "Origin": "https://m.zhengzai.tv",
            "Sec-Fetch-Site": "same-site",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
            "Referer": "https://m.zhengzai.tv/",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "zh-CN,zh;q=0.9",
        }
        cookies = {}
        html = self.session.get(url, headers=headers, verify=False, cookies=cookies)

        enterIdList = []
        for i in html.json().get("data"):
            enterIdList.append(i.get("entersId"))
        return '","'.join(enterIdList[: self.ticketNums])

    def genTicketData(self):
        url = f"https://kylin.zhengzai.tv/kylin/performance/partner/{self.performanceId}?isAgent=0"
        headers = {
            "Host": "kylin.zhengzai.tv",
            "Connection": "keep-alive",
            "sec-ch-ua": '"Google Chrome";v="93", " Not;A Brand";v="99", "Chromium";v="93"',
            "sec-ch-ua-mobile": "?0",
            "Authorization": self.token,
            "Accept": "application/json, text/plain, */*",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36",
            "source": "H5",
            "sec-ch-ua-platform": '"Windows"',
            "version": "1.1",
            "Origin": "https://m.zhengzai.tv",
            "Sec-Fetch-Site": "same-site",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
            "Referer": "https://m.zhengzai.tv/",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "zh-CN,zh;q=0.9",
        }
        html = self.session.get(url, headers=headers, verify=False, cookies={})

        showData = html.json().get("data")
        ticketList = showData.get("ticketTimesList")[0].get("ticketList")
        allData = []

        for single_ticket in ticketList:
            base_result = {
                "title": single_ticket.get("title"),
                "ticketsId": single_ticket.get("ticketsId"),
                "isElectronic": single_ticket.get("isElectronic"),
                "isExpress": single_ticket.get("isExpress"),
                "expressType": single_ticket.get("expressType"),
                "timeId": single_ticket.get("timeId"),
                # status6能买  售罄 t.status=8  lackRegister!=1
                "isLackRegister": single_ticket.get("isLackRegister"),
            }
            allData.append(base_result)

        ticketData = allData[self.ticketType]
        return ticketData

    def create_order(self, ticketData, enterIdList, logPrefix):
        url = "https://order.zhengzai.tv/order/order/pre"
        headers = {
            "Host": "order.zhengzai.tv",
            "Connection": "keep-alive",
            "Content-Length": "632",
            "Pragma": "no-cache",
            "Cache-Control": "no-cache",
            "sec-ch-ua": '"Google Chrome";v="93", " Not;A Brand";v="99", "Chromium";v="93"',
            "version": "1.1",
            "sec-ch-ua-mobile": "?0",
            "Authorization": self.token,
            "Content-Type": "application/json;charset=UTF-8",
            "Accept": "application/json, text/plain, */*",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36",
            "sec-ch-ua-platform": '"Windows"',
            "source": "H5",
            "Origin": "https://m.zhengzai.tv",
            "Sec-Fetch-Site": "same-site",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
            "Referer": "https://m.zhengzai.tv/",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "zh-CN,zh;q=0.9",
        }
        text = (
            f'{{"number":{self.ticketNums},"ticketId":"{ticketData.get("ticketsId")}","isElectronic":{ticketData.get("isElectronic")},"enterIdList":["{str(enterIdList)}"],'
            f'"isExpress":0,"deviceFrom":"wap","actual":199,"performanceId":"{self.performanceId}",'
            f'"timeId":"{ticketData.get("timeId")}",'
            f'"returnUrl":"https://m.zhengzai.tv/#/pay/status?order_type=ticket&order_id=",'
            f'"showUrl":"https://m.zhengzai.tv/#/pay/status?order_type=ticket&order_id=",'
            f'"expressType":{ticketData.get("expressType")},"agentId":0,"payType":"alipay"}}'
        )
        encryptedData = aes_encrypt_base64(text=text)
        timeStamp = int(time.time() * 1000)
        sign = get_str_sha1_secret_str(
            encryptedData + str(timeStamp) + "QGZUanpSaSy9DEPQFVULJQ=="
        )
        data = {"sign": sign, "encryptedData": encryptedData, "timestamp": timeStamp}
        html = self.session.post(
            url, headers=headers, verify=False, cookies={}, data=json.dumps(data)
        )

        if "https://openapi.alipay.com/gateway" in html.text:
            wx_notice(
                f"[start][{str(datetime.datetime.now())}]" + html.text,
                str(enterIdList),
                self.ppTokenList,
            )
            raise Exception(logPrefix, "抢票成功")


def wx_notice(content, enterIdList, sckeyList):
    send(f"正在现场 --- {enterIdList}抢票成功", content)
    for key in sckeyList:
        url = "http://www.pushplus.plus/send"
        data = {"token": key, "title": f"{enterIdList}抢票成功", "content": content, "template": "html"}
        requests.post(url = url, data=json.dumps(data), timeout = 10)


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
