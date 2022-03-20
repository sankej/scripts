import datetime
import time
import re

from Crypto.Cipher import AES
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import algorithms
import random
import json
import base64

# key的类型为什么就传什么  parse 为 将string  转为 object {}
# b64decode 解码  将 string'MTExMTEx'转为  b'111111'

# a.default.enc.Utf8.parse(n)     -----key.encode('utf-8')
# v.a.enc.Base64.parse("XjjkaLnlzAFbR399IP4kdQ==")   ---base64.b64decode("XjjkaLnlzAFbR399IP4kdQ==")
def pkcs7_padding(data):
    if not isinstance(data, bytes):
        data = data.encode()
    padder = padding.PKCS7(algorithms.AES.block_size).padder()

    padded_data = padder.update(data) + padder.finalize()

    return padded_data


def aes_encrypt(key, iv, offset=None, text=None):
    """
        AES 加密   cbc
        :return:
        , t = a.default.enc.Utf8.parse(n)
    , r = a.default.enc.Utf8.parse(e)
    a.default.AES.encrypt(r, t, {
                        mode: a.default.mode.ECB,
                        padding: a.default.pad.Pkcs7
                    });
    """
    cryptor = AES.new(key.encode("utf-8"), AES.MODE_CBC, iv.encode("utf-8"))
    # text = json.dumps(dict_json).encode('utf-8')
    text = pkcs7_padding(text)
    ciphertext = cryptor.encrypt(text)
    cryptbase64 = base64.b64encode(ciphertext).decode("utf8")
    return cryptbase64


def aes_encrypt_base64(key=None, offset=None, text=None):
    """
    AES 加密   cbc
    :return:
    v.a.AES.encrypt(t, v.a.enc.Base64.parse("XjjkaLnlzAFbR399IP4kdQ=="), {
                    mode: v.a.mode.ECB,
                    padding: v.a.pad.Pkcs7,
                    length: 128
                }).toString()
    """
    key = base64.b64decode("XjjkaLnlzAFbR399IP4kdQ==")
    cryptor = AES.new(key, AES.MODE_ECB)
    # text = json.dumps(dict_json).encode('utf-8')
    text = pkcs7_padding(text)
    ciphertext = cryptor.encrypt(text)
    cryptbase64 = base64.b64encode(ciphertext).decode("utf8")
    return cryptbase64


def get_str_sha1_secret_str(res: str):
    import hashlib

    """
    使用sha1加密算法，返回str加密后的字符串
    """
    sha = hashlib.sha1(res.encode("utf-8"))
    encrypts = sha.hexdigest()
    return encrypts


if __name__ == "__main__":
    # iv = "".join(random.sample('abcdefghijklmnopqrstuvwxyz1234567890', 16)).replace(' ', '')
    # key = "".join(random.sample('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=', 16)).replace(' ', '')
    # distence = '29.663492063492065'
    # s = aes_encrypt(key, iv, distence)
    # print(s)
    # js格式
    # password = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(password), CryptoJS.enc.Utf8.parse(common.lol), {
    #     iv: CryptoJS.enc.Utf8.parse(common.lol),
    #     mode: CryptoJS.mode.CBC,
    #     padding: CryptoJS.pad.Pkcs7
    # }).toString();
    # key = 'cn.com.foresee01'
    # iv = 'cn.com.foresee02'
    # text = 'soldoutman'
    # a = aes_encrypt(text=text, key=key, iv=iv)
    # print(a)
    # ----------------------------------
    # a = json.dumps({
    #     "$super": {
    #         "$super": {}
    #     },
    #     "words": [
    #         1580786792,
    #         -1176122367,
    #         1531412349,
    #         553526389
    #     ],
    #     "sigBytes": 16
    # })
    # print(a)
    # a = 'XjjkaLnlzAFbR399IP4kdQ=='
    # a = '常맥찁孇罽⃾⑵'.encode('utf-16').decode('utf-8')
    # print(a)
    # # a = 'å¸¸î¨ë§¥ì°å­ç½½â¾âµ'
    text = '{"number":1,"ticketId":"269666207259484162764506","isElectronic":1,"isExpress":0,"deviceFrom":"wap","actual":199,"performanceId":"269561340078120967835347","timeId":"269561778191523849679438","returnUrl":"https://m.zhengzai.tv/#/pay/status?order_type=ticket&order_id=","showUrl":"https://m.zhengzai.tv/#/pay/status?order_type=ticket&order_id=","expressType":2,"agentId":0,"payType":"alipay"}'
    text = '{"number":1,"ticketId":"140952523996979207837759","isElectronic":1,"isExpress":0,"deviceFrom":"wap","actual":188,"performanceId":"140384366355619843241207","timeId":"140935837336002567495779","returnUrl":"https://m.zhengzai.tv/#/pay/status?order_type=ticket&order_id=","showUrl":"https://m.zhengzai.tv/#/pay/status?order_type=ticket&order_id=","expressType":2,"agentId":0,"payType":"alipay"}'
    s = aes_encrypt_base64(text=text)
    print(s)


def len_zh(data):
    temp = re.findall("[^a-zA-Z0-9.]+", data)
    count = 0
    for i in temp:
        count += len(i)
    return count


class Timer(object):
    def __init__(self):
        self.sleep_interval = 0.05
        pass

    def start(self, buy_time, diff, logPrefix):
        try:
            buy_time = datetime.datetime.strptime(buy_time, "%Y-%m-%d %H:%M:%S.%f")
        except:
            buy_time = datetime.datetime.strptime(buy_time, "%Y-%m-%d %H:%M:%S")
        buy_time_ms = int(
            time.mktime(buy_time.timetuple()) * 1000.0 + buy_time.microsecond / 1000
        )
        while 1:
            if int(round(time.time() * 1000)) + abs(diff) >= buy_time_ms:
                print(logPrefix, "时间到达，开始执行……")
                break
            else:
                time.sleep(self.sleep_interval)
