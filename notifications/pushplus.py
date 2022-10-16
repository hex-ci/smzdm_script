import json
import requests
import os


def pushplus(title, content, token, template='html'):
    url = 'https://www.pushplus.plus/send'
    body = {
        'token': token,
        'title': title,
        'content': content,
        'template': template
    }
    data = json.dumps(body).encode(encoding='utf-8')
    headers = {'Content-Type': 'application/json'}
    rsp = requests.post(url, data=data, headers=headers)
    return rsp.json()


if __name__ == '__main__':
    token = os.environ.get('PUSH_PLUS_TOKEN')
    res = pushplus(title='Title',
                   content='Content',
                   token=token)
    print(res)
