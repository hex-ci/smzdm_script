import requests
import os


def serverchan(text, desp, secretKey):
    url = f'http://sc.ftqq.com/{secretKey}.send'
    session = requests.Session()
    data = {'text': text, 'desp': desp}
    resp = session.post(url, data=data)
    return resp.json()


if __name__ == '__main__':
    token = os.environ.get('PUSH_PLUS_TOKEN')
    resp = serverchan(text='test', desp='hi',
                      secretKey=token)
    print(resp)
