"""
0 8 * * * smzdm_checkin.py
const $ = new Env("什么值得买签到");
"""

import hashlib
import os
import random
import sys
import time
from pathlib import Path

import prettytable as pt
import requests
from notify import send
from utils.file_helper import TomlHelper

CURRENT_PATH = Path(__file__).parent.resolve()
CONFIG_PATH = Path(CURRENT_PATH, "config")


class SmzdmBot(object):
    KEY = "apr1$AwP!wRRT$gJ/q.X24poeBInlUJC"

    def __init__(self, conf_kwargs: dict):
        self.conf_kwargs = conf_kwargs
        self.session = requests.Session()
        self.start_timestamp = int(time.time())
        self._set_header()

    def _set_header(self):
        request_key = f"{random.randint(10000000, 100000000) * 10000000000 + self.start_timestamp}"
        headers = {
            "user-agent": self.conf_kwargs["USER_AGENT"],
            "request_key": request_key,
            "cookie": self.conf_kwargs["ANDROID_COOKIE"],
            "content-type": "application/x-www-form-urlencoded",
            "connection": "keep-alive",
        }
        self.session.headers = headers

    def _data(self):
        time = self.start_timestamp * 1000
        sk = self.conf_kwargs.get("SK")
        token = self.conf_kwargs.get("TOKEN")
        sign_str = f"f=android&sk={sk}&time={time}&token={token}&v=10.4.20&weixin=1&key={self.KEY}"
        sign = self._str_to_md5(sign_str).upper()
        data = {
            "weixin": "1",
            "captcha": "",
            "f": "android",
            "v": "10.4.20",
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
            tb = pt.PrettyTable()
            tb.field_names = ["签到天数", "金币", "积分", "经验", "等级", "补签卡"]
            tb.add_row([checkin_num, gold, point, exp, rank, cards])
            print(f"\n{tb}")
            msg = f"""⭐签到成功{checkin_num}天
🏅金币{gold}
🏅积分{point}
🏅经验{exp}
🏅等级{rank}
🏅补签卡{cards}"""
            return msg
        else:
            print("Faile to sign in")
            msg = "Fail to login in"
            return msg

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
            print(f"Fail to check extra reward: {e}")
        if not continue_checkin_reward_show:
            print("No extra reward today")
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
    conf_kwargs = {}

    if Path.exists(Path(CONFIG_PATH, "config.toml")):
        print("Get configration from config.toml")
        conf_kwargs = TomlHelper(Path(CONFIG_PATH, "config.toml")).read()
        conf_kwargs.update({"toml_conf": True})
    elif os.environ.get("ANDROID_COOKIE", None):
        print("Get configration from env")
        conf_kwargs = {
            "USER_AGENT": os.environ.get("USER_AGENT"),
            "SK": os.environ.get("SK"),
            "ANDROID_COOKIE": os.environ.get("ANDROID_COOKIE"),
            "TOKEN": os.environ.get("TOKEN"),
        }
        conf_kwargs.update({"env_conf": True})
    else:
        print("Please set cookies first")
        sys.exit(1)
    return conf_kwargs


def main(conf_kwargs):
    msg = ""
    if conf_kwargs.get("toml_conf"):
        for i in conf_kwargs["user"]:
            try:
                bot = SmzdmBot(conf_kwargs["user"][i])
                msg += bot.checkin()
                bot.all_reward()
                bot.extra_reward()
            except Exception as e:
                print(e)
                continue
        send("什么值得买签到", msg)
    else:
        bot = SmzdmBot(conf_kwargs)
        msg = bot.checkin()
        bot.all_reward()
        bot.extra_reward()
        send("什么值得买签到", msg)
    if msg is None or "Fail to login in" in msg:
        print("Fail the Github action job")
        sys.exit(1)


if __name__ == "__main__":
    main(conf_kwargs())
