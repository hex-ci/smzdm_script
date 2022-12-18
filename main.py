import json
import os
import sys
from pathlib import Path

import prettytable as pt
import requests
from loguru import logger

from notify.notify import NotifyBot
from utils.file_helper import TomlHelper

CURRENT_PATH = Path(__file__).parent.resolve()
CONFIG_PATH = Path(CURRENT_PATH, "config")

MANUAL_ERR_MSG = "签到失败,请从浏览器手动签到一次,并更新cookies"


class SMZDM_Bot(object):

    DEFAULT_HEADERS = {
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "zh-CN,zh;q=0.9",
        "Connection": "keep-alive",
        "Host": "zhiyou.smzdm.com",
        "Referer": "https://www.smzdm.com/",
        "Sec-Fetch-Dest": "script",
        "Sec-Fetch-Mode": "no-cors",
        "Sec-Fetch-Site": "same-site",
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.54"
        ),
    }

    def __init__(self):
        self.session = requests.Session()
        self.session.headers = self.DEFAULT_HEADERS

    def update_cookies(self, cookies):
        self.session.cookies.update(cookies)

    def set_cookies(self, cookies):
        self.session.headers["Cookie"] = cookies

    def checkin(self):
        url = "https://zhiyou.smzdm.com/user/checkin/jsonp_checkin"
        resp = self.session.get(url)
        if resp.status_code == 200 and resp.json()["error_code"] == 0:
            resp_data = resp.json()["data"]
            checkin_num = resp_data["checkin_num"]
            days_of_week = resp_data["continue_checkin_days"]
            gold = resp_data["gold"]
            point = resp_data["point"]
            exp = resp_data["exp"]
            rank = resp_data["rank"]
            cards = resp_data["cards"]
            tb = pt.PrettyTable()
            tb.field_names = ["签到天数", "连续签到", "金币", "积分", "经验", "等级", "补签卡"]
            tb.add_row([checkin_num, days_of_week, gold, point, exp, rank, cards])
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
            msg = MANUAL_ERR_MSG


def main():
    smzdm_bot = SMZDM_Bot()
    conf_kwargs = {}

    if Path.exists(Path(CONFIG_PATH, "config.toml")):
        logger.info("Get configration from config.toml")
        conf_kwargs = TomlHelper(Path(CONFIG_PATH, "config.toml")).read()
        SMZDM_COOKIE = conf_kwargs.get("SMZDM_COOKIE").encode("UTF-8").decode("latin-1")
        smzdm_bot.set_cookies(SMZDM_COOKIE)
    elif os.environ.get("SMZDM_COOKIE", None):
        logger.info("Get configration from env")
        conf_kwargs = {
            "SMZDM_COOKIE": os.environ.get("SMZDM_COOKIE"),
            "PUSH_PLUS_TOKEN": os.environ.get("PUSH_PLUS_TOKEN", None),
            "SC_KEY": os.environ.get("SC_KEY", None),
            "TG_BOT_TOKEN": os.environ.get("TG_BOT_TOKEN", None),
            "TG_USER_ID": os.environ.get("TG_USER_ID", None),
            "TG_BOT_API": os.environ.get("TG_BOT_API", None),
        }
        SMZDM_COOKIE = conf_kwargs.get("SMZDM_COOKIE").encode("UTF-8").decode("latin-1")
        smzdm_bot.set_cookies(SMZDM_COOKIE)
    elif Path.exists(Path(CONFIG_PATH, "cookies.json")):
        logger.info("Load cookis from cookies.json")
        with open(Path(CONFIG_PATH, "cookies.json", "r")) as f:
            cookies = json.load(f)
        smzdm_cookies = {}
        for cookie in cookies:
            smzdm_cookies.update({cookie["name"]: cookie["value"]})
        smzdm_bot.update_cookies(smzdm_cookies)
    else:
        logger.info("Fail to get SMZDM_COOKIE, exit")
        sys.exit(1)
    msg = smzdm_bot.checkin()
    NotifyBot(content=msg, **conf_kwargs)
    if msg == MANUAL_ERR_MSG:
        logger.error("Fail the Github action job")
        sys.exit(1)


if __name__ == "__main__":
    main()
