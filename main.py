import json
import os
import sys
from pprint import pprint

import requests
from notifications.pushplus import pushplus


class SMZDM_Bot(object):

    DEFAULT_HEADERS = {
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Connection': 'keep-alive',
        'Host': 'zhiyou.smzdm.com',
        'Referer': 'https://www.smzdm.com/',
        'Sec-Fetch-Dest': 'script',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'same-site',
        'User-Agent': ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                       'AppleWebKit/537.36 (KHTML, like Gecko) '
                       'Chrome/74.0.3729.131 Safari/537.36'),
    }

    def __init__(self):
        self.session = requests.Session()
        self.session.headers = self.DEFAULT_HEADERS

    def update_cookies(self, cookies):
        self.session.cookies.update(cookies)

    def set_cookies(self, cookies):
        self.session.headers['Cookie'] = cookies

    def checkin(self):
        url = 'https://zhiyou.smzdm.com/user/checkin/jsonp_checkin'
        resp = self.session.get(url)
        if resp.status_code == 200:
            resp_data = resp.json()["data"]
            checkin_num = resp_data["checkin_num"]
            gold = resp_data["gold"]
            point = resp_data["point"]
            exp = resp_data["exp"]
            rank = resp_data["rank"]
            cards = resp_data["cards"]
            msg = f'''⭐签到成功{checkin_num}天
            🏅金币{gold}
            🏅积分{point}
            🏅经验{exp}
            🏅等级{rank}
            🏅补签卡{cards}'''
            return msg
        else:
            pprint("Faile to sign in")


if __name__ == '__main__':
    smzdm_bot = SMZDM_Bot()
    if not os.environ.get("SMZDM_COOKIE", None):
        current_dir = os.path.dirname(os.path.realpath(__file__))
        cookies_file_path = os.path.join(current_dir, 'cookies.json')
        if not os.path.exists(cookies_file_path):
            pprint("Cookies not existed, exit")
            sys.exit(1)
        with open("cookies.json", "r") as f:
            cookies = json.load(f)
        smzdm_cookies = {}
        for cookie in cookies:
            smzdm_cookies.update({cookie["name"]: cookie["value"]})
        smzdm_bot.update_cookies(smzdm_cookies)
    else:
        smzdm_cookies = os.environ.get(
            "SMZDM_COOKIE").encode('UTF-8').decode('latin-1')
        smzdm_bot.set_cookies(smzdm_cookies)
    resp = smzdm_bot.checkin()
    if not os.environ.get('PUSH_PLUS_TOKEN'):
        pprint("Skip PushPlus notication")
    else:
        title = '什么值得买每日签到'
        token = os.environ.get('PUSH_PLUS_TOKEN')
        pushplus(title=title, content=resp, token=token)
