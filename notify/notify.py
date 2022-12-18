import json
from typing import Dict
from urllib.parse import urljoin

import requests
from loguru import logger


class NotifyBot(object):
    def __init__(self, content, title="什么值得买签到", **kwargs: Dict) -> None:
        self.content = content
        self.title = title
        self.kwargs = kwargs

        self.push_plus()
        self.server_chain()
        self.tg_bot()

    def push_plus(self, template="html"):
        try:
            if self.kwargs.get("PUSH_PLUS_TOKEN", None):
                PUSH_PLUS_TOKEN = self.kwargs.get("PUSH_PLUS_TOKEN")
            else:
                logger.info("⚠️ PUSH_PLUS_TOKEN not set, skip PushPlus nofitication")
                return

            url = "https://www.pushplus.plus/send"
            body = {
                "token": PUSH_PLUS_TOKEN,
                "title": self.title,
                "content": self.content,
                "template": template,
            }
            data = json.dumps(body).encode(encoding="utf-8")
            headers = {"Content-Type": "application/json"}
            resp = requests.post(url, data=data, headers=headers)
            if resp.status_code == 200:
                logger.info("✅ Push Plus notified")
            return resp.json()
        except Exception as e:
            logger.error(e)

    def server_chain(self):
        try:
            if self.kwargs.get("SC_KEY", None):
                SC_KEY = self.kwargs.get("SC_KEY")
            else:
                logger.info("⚠️ SC_KEY not set, skip ServerChain notification")
                return

            url = f"http://sc.ftqq.com/{SC_KEY}.send"

            data = {"text": self.title, "desp": self.content}
            resp = requests.post(url, data=data)
            if resp.status_code == 200:
                logger.info("✅ Server Chain notified")
            return resp.json()
        except Exception as e:
            logger.error(e)

    def tg_bot(self):
        try:
            if self.kwargs.get("TG_BOT_TOKEN", None) and self.kwargs.get(
                "TG_USER_ID", None
            ):
                TG_BOT_TOKEN = self.kwargs.get("TG_BOT_TOKEN")
                TG_USER_ID = self.kwargs.get("TG_USER_ID")
            else:
                logger.info(
                    "⚠️ TG_BOT_TOKEN & TG_USER_ID not set, skip TelegramBot notification"
                )
                return

            TG_BOT_API = self.kwargs.get("TG_BOT_API", "https://api.telegram.org")
            url = urljoin(TG_BOT_API, f"/bot{TG_BOT_TOKEN}/sendMessage")
            headers = {"Content-Type": "application/x-www-form-urlencoded"}
            payload = {
                "chat_id": str(TG_USER_ID),
                "text": f"{self.title}\n\n{self.content}",
                "disable_web_page_preview": "true",
            }
            resp = requests.post(url=url, headers=headers, params=payload)
            if resp.status_code == 200:
                logger.info("✅ Telegram Bot notified")
            return resp.json()
        except Exception as e:
            logger.error(e)
