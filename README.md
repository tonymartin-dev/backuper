# Find Raspberry IP
```bash
nmap -sn 192.168.1.0/24
```

# connect to Raspberry
```bash
ssh pi@192.168.1.24
```

assuming raspberry ip is 192.168.1.24

# copy files to raspbi

```bash
scp package.json  pi@192.168.1.24:/home/pi/backuper
```