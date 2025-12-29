---
title: Настройка VPN клиента на Raspberry Pi (OpenVPN и WireGuard)
lang: ru
categories:
  - Linux
date: 2025-04-23 00:03:37
tags:
  - linux
  - raspberry Pi
  - vpn
  - openVPN
  - wireGuard
translations:
  en: Open-VPN-client-on-Raspbery
excerpt:
  - Руководство по настройке VPN клиентов на Raspberry Pi для безопасного удаленного доступа
---

Это руководство охватывает настройку VPN клиентов на Raspberry Pi для создания безопасного удаленного доступа из любой точки мира. Вы узнаете, как настроить OpenVPN и WireGuard, включая автоматическое переподключение и маршрутизацию сети.

## Требования

- Raspberry Pi с установленной Raspbian/Raspberry Pi OS
- SSH или прямой доступ к Pi
- Файл конфигурации VPN сервера (.ovpn для OpenVPN или .conf для WireGuard)
- Базовые знания командной строки

## Вариант 1: Настройка клиента OpenVPN

### Установка

Установите клиент OpenVPN:

```bash
sudo apt-get update
sudo apt-get install openvpn -y
```

### Конфигурация

Создайте директорию для конфигурации клиента и добавьте ваш файл конфигурации VPN:

```bash
# Создайте директорию, если её не существует
sudo mkdir -p /etc/openvpn/client

# Скопируйте или создайте файл конфигурации VPN
sudo nano /etc/openvpn/client/client.ovpn
```

Вставьте конфигурацию от вашего VPN провайдера в этот файл. Типичная конфигурация включает адрес сервера, порт, сертификаты и данные для аутентификации.

### Запуск и включение сервиса

Запустите клиент OpenVPN и включите его автозапуск при загрузке:

```bash
# Запустите сервис
sudo systemctl start openvpn-client@client.service

# Включите автозапуск при загрузке
sudo systemctl enable openvpn-client@client.service

# Проверьте статус
systemctl status openvpn-client@client.service
```

**Примечание:** Имя сервиса `openvpn-client@client.service` соответствует файлу конфигурации `/etc/openvpn/client/client.ovpn`. Если ваш файл конфигурации имеет другое имя (например, `myvpn.ovpn`), используйте `openvpn-client@myvpn.service`.

### Проверка подключения

Проверьте ваш публичный IP, чтобы убедиться, что VPN работает:

```bash
curl ifconfig.me
```

IP адрес должен соответствовать местоположению вашего VPN сервера, а не вашему реальному местоположению.

### Автоматическое переподключение

Чтобы VPN автоматически переподключался при обрыве соединения, добавьте эти параметры в файл конфигурации:

```bash
sudo nano /etc/openvpn/client/client.ovpn
```

Добавьте в конец файла:

```conf
# Keepalive: ping каждые 10 секунд, перезапуск при отсутствии ответа 60 секунд
keepalive 10 60

# Использовать таймер соединения для более надежного переподключения
ping-timer-rem
```

Перезапустите сервис для применения изменений:

```bash
sudo systemctl restart openvpn-client@client.service
```

## Вариант 2: Настройка клиента WireGuard

WireGuard — это современный, легковесный VPN протокол с лучшей производительностью и более простой конфигурацией, чем OpenVPN.

### Установка

Установите WireGuard:

```bash
sudo apt update
sudo apt install wireguard -y
```

### Конфигурация

Создайте и настройте интерфейс WireGuard:

```bash
# Создайте файл конфигурации
sudo nano /etc/wireguard/wg0.conf
```

Добавьте вашу конфигурацию WireGuard (предоставленную VPN сервером):

```conf
[Interface]
PrivateKey = ВАШ_ПРИВАТНЫЙ_КЛЮЧ
Address = 10.0.0.2/24
DNS = 1.1.1.1

[Peer]
PublicKey = ПУБЛИЧНЫЙ_КЛЮЧ_СЕРВЕРА
Endpoint = vpn.example.com:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
```

Установите правильные права доступа:

```bash
sudo chmod 600 /etc/wireguard/wg0.conf
```

### Запуск и включение сервиса

Запустите WireGuard и включите его автозапуск при загрузке:

```bash
# Запустите VPN
sudo wg-quick up wg0

# Включите автозапуск при загрузке
sudo systemctl enable wg-quick@wg0

# Проверьте статус
sudo wg show
```

### Включение IP форвардинга (для маршрутизации трафика)

Если вы хотите, чтобы ваш Raspberry Pi маршрутизировал трафик через VPN:

```bash
# Включите IP форвардинг
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Настройка iptables для NAT

Настройте трансляцию сетевых адресов (NAT) для маршрутизации трафика через VPN:

```bash
# Разрешите форвардинг с ethernet на VPN
sudo iptables -t nat -A POSTROUTING -o wg0 -j MASQUERADE
sudo iptables -A FORWARD -i wg0 -o eth0 -m state --state RELATED,ESTABLISHED -j ACCEPT
sudo iptables -A FORWARD -i eth0 -o wg0 -j ACCEPT
```

Сделайте правила iptables постоянными после перезагрузки:

```bash
sudo apt install iptables-persistent -y
```

Во время установки выберите "Да" для сохранения текущих правил IPv4 и IPv6.

Чтобы сохранить правила позже:

```bash
sudo netfilter-persistent save
```

## Настройка сети

### Настройка статического IP адреса

Для надежной маршрутизации VPN установите статический IP адрес для вашего Raspberry Pi:

```bash
sudo nano /etc/dhcpcd.conf
```

Добавьте в конец файла (настройте значения для вашей сети):

```conf
# Конфигурация статического IP
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8

# Для WiFi используйте wlan0 вместо eth0
# interface wlan0
# static ip_address=192.168.1.101/24
# static routers=192.168.1.1
# static domain_name_servers=192.168.1.1 8.8.8.8
```

**Замените на значения вашей сети:**
- `192.168.1.100` - Желаемый статический IP для вашего Pi
- `192.168.1.1` - IP вашего роутера (шлюз)
- `8.8.8.8` - Вторичный DNS сервер (Google DNS)

Перезапустите сеть:

```bash
sudo systemctl restart dhcpcd
```

## Устранение неполадок

### Проверка статуса VPN

**Для OpenVPN:**
```bash
sudo systemctl status openvpn-client@client.service
journalctl -u openvpn-client@client.service -f
```

**Для WireGuard:**
```bash
sudo wg show
journalctl -u wg-quick@wg0 -f
```

### Тестирование подключения

```bash
# Проверьте, существует ли интерфейс VPN
ip addr show

# Проверьте таблицу маршрутизации
ip route

# Проверьте интернет через VPN
curl ifconfig.me

# Пингуйте VPN сервер
ping 10.0.0.1  # Замените на IP вашего VPN сервера
```

### Частые проблемы

**OpenVPN не запускается:**
- Проверьте синтаксис файла конфигурации: `sudo openvpn --config /etc/openvpn/client/client.ovpn`
- Убедитесь, что сертификаты и ключи корректны
- Проверьте настройки файрвола

**Соединение WireGuard обрывается:**
- Добавьте `PersistentKeepalive = 25` в секцию [Peer]
- Проверьте, доступна ли конечная точка сервера
- Убедитесь, что файрвол разрешает UDP трафик на порту WireGuard

**Нет интернета после подключения:**
- Проверьте настройки DNS в конфигурации VPN
- Убедитесь, что `AllowedIPs = 0.0.0.0/0` для полного туннеля
- Тест с помощью: `nslookup google.com`