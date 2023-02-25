"""
什么值得买自动签到脚本
项目地址: https://github.com/hex-ci/smzdm_script
0 8 * * * smzdm_checkin.py
const $ = new Env("什么值得买签到");
"""

import hashlib
import os
import random
import sys
import time
import re

import requests
from notify import send


class SmzdmBot(object):
    KEY = "apr1$AwP!wRRT$gJ/q.X24poeBInlUJC"
    DEFAULT_USER_AGENT = "smzdm_android_V10.4.25 rv:860 (Redmi Note 3;Android10;zh)smzdmapp"

    def __init__(self, conf_kwargs: dict, index):
        self.conf_kwargs = conf_kwargs
        self.index = index
        self.session = requests.Session()

    def _set_header(self):
        request_key = f"{random.randint(10000000, 100000000) * 10000000000 + self.start_timestamp}"
        headers = {
            "user-agent": os.environ.get("SMZDM_USER_AGENT") or self.DEFAULT_USER_AGENT,
            "request_key": request_key,
            "cookie": self.conf_kwargs["COOKIE"],
            "content-type": "application/x-www-form-urlencoded",
            "connection": "keep-alive",
        }
        self.session.headers = headers

    def _data(self):
        time = self.start_timestamp * 1000
        sk = self.conf_kwargs.get("SK")
        token = self.conf_kwargs.get("TOKEN")
        sign_str = f"f=android&sk={sk}&time={time}&token={token}&v=10.4.25&weixin=1&key={self.KEY}"
        sign = self._str_to_md5(sign_str).upper()
        data = {
            "weixin": "1",
            "captcha": "",
            "f": "android",
            "v": "10.4.25",
            "sk": sk,
            "sign": sign,
            "touchstone_event": "",
            "time": time,
            "token": token,
        }
        return data

    def _str_to_md5(self, m: str):
        return hashlib.md5(m.encode()).hexdigest()

    def checkin(self):
        url = "https://user-api.smzdm.com/checkin"

        if self.index > 1:
            print("延时 5 秒执行")
            time.sleep(5)

        sep = "\n********开始账号" + str(self.index) + "********"
        print(sep + "\n")

        self.start_timestamp = int(time.time())
        self._set_header()
        data = self._data()

        resp = self.session.post(url, data)

        if resp.status_code == 200 and int(resp.json()["error_code"]) == 0:
            resp_data = resp.json()["data"]
            checkin_num = resp_data["daily_num"]
            gold = resp_data["cgold"]
            point = resp_data["cpoints"]
            exp = resp_data["cexperience"]
            rank = resp_data["rank"]
            cards = resp_data["cards"]

            msg = f"""⭐签到成功{checkin_num}天
🏅金币:{gold}
🏅积分:{point}
🏅经验:{exp}
🏅等级:{rank}
🏅补签卡:{cards}\n"""

            print(msg)
            return sep + "\n" + msg
        else:
            print("登录失败", resp.json())
            msg += "登录失败\n"
            return sep + "\n" + msg

    def all_reward(self):
        url = "https://user-api.smzdm.com/checkin/extra_reward"
        data = self._data()
        resp = self.session.post(url, data)
        if resp.status_code == 200 and int(resp.json()["error_code"]) == 0:
            print(resp.json()["data"])

    def extra_reward(self):
        continue_checkin_reward_show = False
        userdata_v2 = self._show_view_v2()
        try:
            for item in userdata_v2["data"]["rows"]:
                if item["cell_type"] == "18001":
                    continue_checkin_reward_show = item["cell_data"][
                        "checkin_continue"
                    ]["continue_checkin_reward_show"]
                    break
        except Exception as e:
            print(f"检查额外奖励失败: {e}\n")
        if not continue_checkin_reward_show:
            print("今天没有额外奖励\n")
            return
        url = "https://user-api.smzdm.com/checkin/extra_reward"
        data = self._data()
        resp = self.session.post(url, data)
        print(resp.json()["data"])

    def _show_view_v2(self):
        url = "https://user-api.smzdm.com/checkin/show_view_v2"
        data = self._data()
        resp = self.session.post(url, data)
        if resp.status_code == 200 and int(resp.json()["error_code"]) == 0:
            return resp.json()

    def _vip(self):
        url = "https://user-api.smzdm.com/vip"
        data = self._data()
        resp = self.session.post(url, data)
        print(resp.json()["data"])


def conf_kwargs():
    conf_kwargs = []

    if os.environ.get("SMZDM_COOKIE", None):
        cookies = os.environ["SMZDM_COOKIE"].split("&")
        for cookie in cookies:
            try:
                token = re.findall(r"sess=(.*?);", cookie)[0]
                conf_kwargs.append({
                    "SK": "1",
                    "COOKIE": cookie,
                    "TOKEN": token,
                })
            except:
                print("发生异常错误")
    else:
        print("请先设置 SMZDM_COOKIE 环境变量")
        sys.exit(1)
    return conf_kwargs


def main(conf_kwargs):
    msg = ""
    index = 0
    for config in conf_kwargs:
        try:
            index += 1
            bot = SmzdmBot(config, index)
            msg += bot.checkin()
            bot.all_reward()
            bot.extra_reward()
        except Exception as e:
            print(e)
            continue

    send("什么值得买签到", msg)

    if msg is None or "Fail to login in" in msg:
        print("发生异常错误")
        sys.exit(1)


if __name__ == "__main__":
    main(conf_kwargs())
