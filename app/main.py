import hashlib
import os
import random
import sys
import time
from pathlib import Path

import prettytable as pt
import requests
from loguru import logger

from notify.notify import NotifyBot
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
            "user-agent": self.conf_kwargs.get("USER_AGENT"),
            "request_key": request_key,
            "cookie": self.conf_kwargs.get("ANDROID_COOKIE"),
            "content-type": "application/x-www-form-urlencoded",
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
            logger.info(f"\n{tb}")
            msg = f"""⭐签到成功{checkin_num}天
            🏅金币{gold}
            🏅积分{point}
            🏅经验{exp}
            🏅等级{rank}
            🏅补签卡{cards}"""
            return msg
        else:
            logger.error("Faile to sign in")
            msg = "Fail to login in"
            return msg


def main():
    conf_kwargs = {}

    if Path.exists(Path(CONFIG_PATH, "config.toml")):
        logger.info("Get configration from config.toml")
        conf_kwargs = TomlHelper(Path(CONFIG_PATH, "config.toml")).read()
    elif os.environ.get("ANDROID_COOKIE", None):
        logger.info("Get configration from env")
        conf_kwargs = {
            "USER_AGENT": os.environ.get("USER_AGENT"),
            "SK": os.environ.get("SK"),
            "ANDROID_COOKIE": os.environ.get("ANDROID_COOKIE"),
            "TOKEN": os.environ.get("TOKEN"),
            "PUSH_PLUS_TOKEN": os.environ.get("PUSH_PLUS_TOKEN", None),
            "SC_KEY": os.environ.get("SC_KEY", None),
            "TG_BOT_TOKEN": os.environ.get("TG_BOT_TOKEN", None),
            "TG_USER_ID": os.environ.get("TG_USER_ID", None),
            "TG_BOT_API": os.environ.get("TG_BOT_API", None),
        }
    else:
        logger.info("Please set cookies first")
        sys.exit(1)
    msg = SmzdmBot(conf_kwargs).checkin()
    NotifyBot(content=msg, **conf_kwargs)
    if msg == "Fail to login in":
        logger.error("Fail the Github action job")
        sys.exit(1)


if __name__ == "__main__":
    main()
