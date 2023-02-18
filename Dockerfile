FROM python:alpine as builder

RUN apk update && apk add  --no-cache tzdata ca-certificates
ADD requirements.txt /tmp/
RUN pip3 install --user -r /tmp/requirements.txt


FROM python:alpine
WORKDIR /smzdm_bot
ENV TZ=Asia/Shanghai

COPY --from=builder /root/.local /usr/local
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY . /smzdm_bot

CMD [ "python", "scheduler.py" ]
