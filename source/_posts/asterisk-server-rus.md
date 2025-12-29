---
title: Самостоятельная настройка SIP сервера
date: 2025-12-29 23:14:34
lang: ru
categories:
- Linux
tags:
- linux
- self-hosted
- sip
translations:
  en: asterisk
excerpt:
- Настройка самостоятельного SIP сервера с использованием Asterisk
---

## Самостоятельная настройка SIP сервера

Если вам нужно подключить несколько SIP устройств в локальной сети или через интернет без использования коммерческого SIP сервера, вы можете это сделать на небольшом VPS или Raspberry Pi.
(Предполагается, что у вас уже есть VPS или Raspberry Pi и вы знаете, как пользоваться командной строкой)

Шаг 1. Установка

```bash
sudo apt update
sudo apt install asterisk
```

Проверьте, что Asterisk запустился (Вы должны увидеть "active (running)")

```bash
sudo systemctl status asterisk
```

Шаг 2. Настройка аккаунтов

В `sudo nano /etc/asterisk/pjsip.conf`

Добавьте конфигурацию:

```ini

[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060 ; вы можете изменить порт по умолчанию
external_media_address=[IP адрес VPS]
external_signaling_address=[IP адрес VPS]
local_net=192.168.0.0/16 ;опционально
local_net=10.0.0.0/8 ;опционально

; ----- Пользователь 1 -----
[1001]
type=endpoint
context=internal
disallow=all
allow=ulaw
auth=1001
aors=1001
direct_media=no ; Принудительная маршрутизация RTP через Asterisk
rtp_symmetric=yes ; Важно для NAT
force_rport=yes ; Важно для NAT
rewrite_contact=yes ; Важно для NAT

[1001]
type=auth
auth_type=userpass
password=strongpassword1
username=1001

[1001]
type=aor
max_contacts=1
remove_existing=yes

; ----- Пользователь 2 -----
[1002]
type=endpoint
context=internal
disallow=all
allow=ulaw
auth=1002
aors=1002
direct_media=no ; Принудительная маршрутизация RTP через Asterisk
rtp_symmetric=yes ; Важно для NAT
force_rport=yes ; Важно для NAT
rewrite_contact=yes ; Важно для NAT
media_encryption=sdes  ; Включить SRTP для шифрованного аудио, может не поддерживаться на старых устройствах, установите no для старых устройств или приложений. Или sdes, или dtls, или srtp

[1002]
type=auth
auth_type=userpass
password=strongpassword2
username=1002
;realm=[ваш домен] ; в некоторых случаях, если вы установили default-realm, нужно установить то же самое для всех клиентов

[1002]
type=aor
max_contacts=1
remove_existing=yes
qualify_frequency=60
maximum_expiration=3600
minimum_expiration=60

; Повторите, если нужно больше пользователей

```

**Объяснение ключевых параметров:**

- `type=endpoint` - Определяет SIP конечную точку
- `context=internal` - Какой контекст диалплана использовать
- `auth=1001` - Ссылка на секцию аутентификации
- `aors=1001` - Ссылка на AOR (Address of Record)
- `max_contacts=1` - Сколько устройств может одновременно зарегистрироваться
- `remove_existing=yes` - Заменяет старую регистрацию при новом входе
- `direct_media=no` - Принудительная маршрутизация RTP через Asterisk (полезно для NAT)
- `media_encryption=no` - Шифрование

**Опции media_encryption:**

- `no` - Без шифрования
- `sdes` - SRTP с обменом ключами SDES
- `dtls` - SRTP с обменом ключами DTLS

Использование опционального шифрования:

```
media_encryption=sdes
media_encryption_optimistic=yes ; Разрешить откат к незашифрованному соединению
```


Определите диалплан в `/etc/asterisk/extensions.conf`
(Например, любой пользователь может позвонить другому (например, 1001 → 1002).)

```ini

[internal]
exten => _1XXX,1,Dial(PJSIP/${EXTEN},20)
exten => _1XXX,n,Hangup()
```

Перезагрузите Asterisk

```bash
sudo asterisk -rx "reload"

# ИЛИ

sudo systemctl restart asterisk

```

Для проверки пользователей

```bash
sudo asterisk -rvvv
# затем:
pjsip show endpoints
```

RTP медиа-порты (Опционально)
Вы можете уменьшить количество портов для RTP
в `/etc/asterisk/rtp.conf`

```
[general]
rtpstart=10000
rtpend=20000
```

Проверка логов

```
sudo asterisk -rvvv
```

На моём старом Ubuntu сервере мне потребовались дополнительные изменения для использования PJSIP вместо **chan_sip** (устаревший драйвер канала SIP). Без этих изменений настройки выше не будут работать (потому что настройки для chan_sip должны быть размещены в `/etc/asterisk/sip.conf`).

Настройка загрузки модуля PJSIP
в `/etc/asterisk/modules.conf` обновите список модулей для загрузки:
```
[modules]
autoload=yes

; Отключить chan_sip
noload => chan_sip.so

; Убедитесь, что модули PJSIP загружены
load => res_pjsip.so
load => res_pjsip_session.so
load => res_pjsip_registrar.so
load => res_pjsip_outbound_registration.so
load => chan_pjsip.so
```


### STUN

В файле:  `/etc/asterisk/rtp.conf`

добавьте:
```
[general]
rtpstart=10000
rtpend=20000
stunaddr=stun.l.google.com:19302  ; Для обхода NAT
```


Проверка клиентов:
```bash
asterisk -rx "pjsip show endpoints"
asterisk -rx "pjsip show contacts"
```

### Отладка проблем медиа-согласования
```bash
asterisk -rvvvvv
```

Затем в CLI:
```
pjsip set logger on
core set debug 5
```

Сделайте тестовый звонок и следите за:
```
-- Called PJSIP/1002
-- PJSIP/1002-00000001 is ringing
[NOTICE] res_pjsip_session.c: Incompatible media format - no common codec
```

Или:
```
WARNING[xxxxx]: res_pjsip_sdp_rtp.c: No common codecs between endpoints
```

#### Понимание полей статуса

- **Avail** - Устройство доступно (qualify успешен)
- **Unavail** - Устройство не ответило на ping qualify, **но звонки всё равно могут работать**
- **NonQual** - Qualify не настроен
- **Unknown** - Проверки qualify ещё не выполнялись

**Важно:** Статус влияет на решения по маршрутизации звонков только если вы используете `qualify` в логике диалплана. Для базовых звонков это не имеет значения!

#### Настройки безопасности PJSIP

В `/etc/asterisk/pjsip.conf`:

```ini

[global]
allow_anonymous=no
max_forwards=70
user_agent=Asterisk PBX
default_realm=[ваш домен]

; ACL для ограничения источников регистрации (опционально, но рекомендуется)
[acl]
type=acl
deny=0.0.0.0/0.0.0.0
permit=IP_ВАШЕГО_ОФИСА/32
permit=IP_ВАШЕГО_ДОМА/32


```

Отключите ненужные модули в `/etc/asterisk/modules.conf`

```ini

[modules]
autoload=yes

; Отключить chan_sip, если используете PJSIP
noload => chan_sip.so

; Отключить ненужные протоколы
noload => chan_skinny.so
noload => chan_mgcp.so
noload => chan_unistim.so

; Отключить веб-интерфейс, если не нужен
noload => res_http_websocket.so
noload => res_ari.so
noload => res_stasis.so
```

Защита Asterisk Manager Interface (AMI) в `/etc/asterisk/manager.conf`

```ini

[general]
enabled = no  ; Отключить, если не нужен
port = 5038
bindaddr = 127.0.0.1  ; Только локальный доступ

; Если вам нужен AMI, используйте сильные учётные данные:
[admin]
secret = VeryStr0ngAMIPass123!
deny = 0.0.0.0/0.0.0.0
permit = 127.0.0.1/255.255.255.0
read = system,call,log,verbose,command,agent,user,config
write = system,call,log,verbose,command,agent,user,config
```

Проверка подозрительной активности:

```bash
# Проверить неудачные попытки регистрации
asterisk -rx "pjsip show registrations"

# Мониторинг активных каналов
asterisk -rx "core show channels"
```

## SSL

Вариант A: Let's Encrypt (Бесплатно и рекомендуется)
```bash
# Установить Certbot
sudo apt update
sudo apt install certbot

# Получить сертификат
sudo certbot certonly --standalone -d [ваш домен]

# Сертификат будет находиться по адресу:
# /etc/letsencrypt/live/[ваш домен]/fullchain.pem
# /etc/letsencrypt/live/[ваш домен]/privkey.pem
```

Вариант B: Самоподписанный сертификат
```bash

sudo mkdir -p /etc/asterisk/keys
cd /etc/asterisk/keys

# Сгенерировать приватный ключ и сертификат
sudo openssl req -new -x509 -days 365 -nodes \
  -out asterisk.pem -keyout asterisk.key \
  -subj "/C=RU/ST=State/L=City/O=Organization/CN=s.mdroid.ru"

# Объединить их
sudo cat asterisk.key asterisk.pem > asterisk.combined.pem
sudo chmod 600 asterisk.combined.pem
```

Установка правильных прав доступа
```bash
# Для сертификатов Let's Encrypt
sudo chown -R asterisk:asterisk /etc/letsencrypt/
sudo chmod -R 640 /etc/letsencrypt/live/s.mdroid.ru/*.pem

# Для самоподписанных сертификатов
sudo chown asterisk:asterisk /etc/asterisk/keys/*
sudo chmod 600 /etc/asterisk/keys/*
```
#### Настройка

В файле: `/etc/asterisk/pjsip.conf`
```ini
[global]
max_forwards=70
user_agent=Asterisk PBX
default_realm=[ваш домен или asterisk]

; UDP транспорт (оставьте для обратной совместимости)
[transport-udp]
....

; TLS транспорт (безопасный)
[transport-tls]
type=transport
protocol=tls
bind=0.0.0.0:5061
cert_file=/etc/letsencrypt/live/[ваш домен]/fullchain.pem
priv_key_file=/etc/letsencrypt/live/[ваш домен]/privkey.pem
; ИЛИ для самоподписанного:
; cert_file=/etc/asterisk/keys/asterisk.combined.pem
; priv_key_file=/etc/asterisk/keys/asterisk.combined.pem
;cipher=ALL ; используйте только если вы знаете, какой формат поддерживается
method=sslv23 ; или tlsv1_2 для современных устройств
verify_server=no
verify_client=no
external_media_address=[IP сервера]
external_signaling_address=[IP сервера]

; Обновите конечные точки для использования TLS
[1001]
type=endpoint
context=internal
;transport=transport-tls ;опционально, чтобы принудительно использовать TLS
disallow=all
allow=ulaw
allow=alaw
auth=1001
aors=1001
direct_media=no
rtp_symmetric=yes
force_rport=yes
rewrite_contact=yes
media_encryption=sdes  ; Включить SRTP для шифрованного аудио, может не поддерживаться на старых устройствах, установите no для старых устройств или приложений. Или sdes, или dtls

[1001]
type=auth
auth_type=userpass
password=YourStrongPassword
username=1001
;realm=[ваш домен] ; в некоторых случаях, если вы установили default-realm, нужно установить то же самое для всех клиентов

[1001]
type=aor
max_contacts=1
remove_existing=yes
qualify_frequency=60
```

Перезагрузка:
```bash
# Перезагрузка
asterisk -rx "core reload"
asterisk -rx "pjsip reload"

# Проверка работы TLS транспорта
asterisk -rx "pjsip show transports"
```

Вы должны увидеть вывод вроде:
```bash
Transport:  <TransportId........>  <Type>  <cos>  <tos>  <BindAddress.....................>
===========================================================================
transport-udp               udp      0      0  0.0.0.0:5060
transport-tls               tls      0      0  0.0.0.0:5061
```

Если вы не видите `transport-tls`, проверьте логи:

```
tail -50 /var/log/asterisk/full | grep -i transport
```
Если вы видите ошибку:

```
ERROR[1069851] res_sorcery_config.c: Could not create an object of type 'transport' with id 'transport-tls' from configuration file 'pjsip.conf'
```

Проверьте:
- Что путь к файлам сертификатов правильный
- Удалите или измените параметр cipher (у меня работает: `cipher=ADH-AES256-SHA,ADH-AES128-SHA`)

Для самоподписанных сертификатов вам нужно отключить проверку сертификата на клиенте или добавить в `/etc/asterisk/pjsip.conf`:

```ini
[transport-tls]
....
require_client_cert=no
```
