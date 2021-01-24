# Backuper

> **Disclaimer**: this tool has been developed as an personal experiment. I'm learning new technologies and I cannot guarantee it works properly so it may cause data loss. I don't recommend you using this tool to work with important files. **USE IT UNDER YOUR OWN RESPONSIBILITY**

**Backuper** is a tool which allows to make an automatic backup of a folder content in another folder. Those are some use cases:
- Make copies from a folder in your computer to an external drive.
- Synchronize two external drives, so one of them would be the other one's backup.
- Previous point can be specially usefull when using some low power consumption computer such as RaspberryPi to keep two discs always synchronized

If you have no experience with NodeJs, you might reconsider using this tool. But, hey, feel free to experiment as I'm doing! ;-)

## Environment

- Nodejs: v12.13.0
- npm: v6.12.0

## Set Up

### Install dependencies

The first step is to download this repo in your PC or server, and then go to repo's folder and install required dependencies running this command:

```bash
$ npm install
```

### Configuration

**Backuper** needs to be configured properly in order to work. All configuration data is located in `config.json`:

- source_dir: origin or source path. Files and folders located in this path will be backuped by **Backuper**

- dest_dir: destiny path. This is where the files located in `source_dir` will be copied.
        > **Important!** This folder must NEVER be modified manually. It could cause **bacuper** to fail and lead to data loss.

- log_dir: folder where **Backuper** will create text files with each backup process information.

- excluded_dirs: list of diretories which will be ignored during the backup process.

## Usage

Run the script with this commands (not sure if this param notation is correct, hehehe):

- Make just one backup:

    ```bash
    $ backuper-1.0.js
    ```
- Program backuper to run periodically

    ```bash
    $ backuper-1.0.js [--type] [timeParams] [cron]
    ```


### --type param

This param will determine whether you want backup to be executed _at_ day X / time Y or if you want it to be executed _every_ X minutes/hours/...

|  Value     | Description | Example |
|------------|-------------|---------|
| at  | Backuper will use timeParams to describe the moment when the backup will be fired | Make a backup every Saturday at midnight |
|every |Backuper will use timeParams to set the interval length | Make a backup every 3 days |
----

### time parameters

This params will configure the interval duration or milestones.

|  Name      |  Value  |
|------------|---------|
| --seconds  | 0-59    |
| --minutes  | 0-59    |
| --hours    | 0-23    |
| --days     | 0-31    |
| --months   | 1-12 or name (January, February, ...)  |
| --weekDay  | 0-7 (0 and 7 = sunday) or name (Moday, Tuesday, ...) |
---

### cron

If you're familiar with [node-cron](https://www.npmjs.com/package/node-cron), use this param to pass a string directly to the cron function.

## Usage Examples

- Make one backup manually
    ```bash
    $ node backuper-1.0.js
    ```

- Make a backup on Mondays at 13:45h
    ```bash
    $ node backuper-1.0.js --at --hours=13 --minutes=45
    ```

- Make a backup every 2 hours and 30 minutes
    ```bash
    $ node backuper-1.0.js --every --hours=2 --minutes=30
    ```

- Make a backup every 2 minutes using node-cron notation
    ```bash
    $ node backuper-1.0.js --cron="2 * * * *"
    ```

-----



## Raspberry tips

These are some notes for me, but here they are so, if they are usefull to you, great!!

### Find Raspberry IP
```bash
nmap -sn 192.168.1.0/24
```

### connect to Raspberry
```bash
ssh pi@192.168.1.24
```

assuming raspberry ip is 192.168.1.24

### copy files to raspbi

```bash
scp package.json  pi@192.168.1.24:/home/pi/backuper
```