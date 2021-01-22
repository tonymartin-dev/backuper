const fs = require('fs')
const stats = fs.lstatSync
const cron = require("node-cron")

let BACKUP_SRC
let BACKUP_DEST
let LOG_FOLDER
let LAST_BCKP_FILE
let EXCLUDED_FOLDERS

let now
let lastBackupDate
let lastBackupDateParsed
const allFiles = []

function isExcluded(folderPath) {
  return EXCLUDED_FOLDERS.some(ef => folderPath.includes(ef))
}

function getConfig() {
  const configBuffer = fs.readFileSync('./config.json')
  const config = JSON.parse(configBuffer)
  BACKUP_SRC = config.source_dir
  BACKUP_DEST = config.dest_dir
  LOG_FOLDER = config.log_dir
  LAST_BCKP_FILE = `${LOG_FOLDER}/last_backup.txt`
  EXCLUDED_FOLDERS = config.excluded_dirs
  console.log('\n > [CONFIG]:', {
    BACKUP_SRC,
    BACKUP_DEST,
    LOG_FOLDER,
    LAST_BCKP_FILE,
    EXCLUDED_FOLDERS
  })
}

function getFileContainer(filePath) {
  const pathArray = filePath.split('/')
  pathArray.pop()
  return pathArray.join('/')
}

function getLastBackupDate() {
  try {
    if (fs.existsSync(LAST_BCKP_FILE)) {
      lastBackupDate = fs.readFileSync(LAST_BCKP_FILE, { encoding: 'utf8', flag: 'r' })
      lastBackupDateParsed = new Date(lastBackupDate).getTime()
      console.log('\n\n > [LAST BACKUP]', lastBackupDate)
    } else {
      console.log('\n\n > [LAST BACKUP] No data found. Creating first backup')
    }
  } catch (error) {
    console.log('> [WARN] No last backup info')
  }
}

const getNewAndModifiedFiles = (folderPath) => {
  console.log('\n\n > [SEARCHING FILES] Searching files modified after last backup')
  // if (!fs.existsSync(BACKUP_SRC)) {
  //   throw Error(`\n\n > [${BACKUP_SRC}] Folder doesn't exist\n`)
  // }
  console.log(' * Checking if directory exists: ', BACKUP_SRC)
  try {
    fs.accessSync(BACKUP_SRC, fs.constants.R_OK | fs.constants.W_OK);
    console.log(" * Directory exists.")
  } catch (err) {
    console.log(" ! Directory does not exist.")
  }

  const elements = fs.readdirSync(folderPath)

  elements.forEach(el => {
    const elPath = `${folderPath}/${el}`

    if (stats(elPath).isFile()) {
      const modifiedTime = stats(elPath).mtime
      const modifiedParsed = new Date(modifiedTime).getTime()

      if (lastBackupDateParsed - modifiedParsed <= 24 * 60 * 60 * 1000) {
        allFiles.push({ modifiedTime, elPath })
      }
    } else if (stats(elPath).isDirectory() && !isExcluded(folderPath)) {
      getNewAndModifiedFiles(elPath)
    }
  })
}

function createLog() {
  const dateString = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`
  const timeString = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`
  const logFolder = `${LOG_FOLDER}/${dateString}`
  console.log('\n\n > [LOG] Creating log in ', logFolder)

  fs.mkdirSync(logFolder, { recursive: true })
  // ToDo: create file error logger
  const lastBckpLogFile = fs.createWriteStream(LAST_BCKP_FILE)
  lastBckpLogFile.on('error', e => console.log(' ! ERROR CREATING "LAST BACKUP" LOG FILE ! ', e))
  lastBckpLogFile.write(now.toString())
  lastBckpLogFile.end()

  const logFile = fs.createWriteStream(`${logFolder}/${timeString}.txt`)
  logFile.on('error', e => console.log(' ! ERROR CREATING LOG FILE ! ', e))
  logFile.write(
    allFiles.map(f => `${f.modifiedTime} - ${f.elPath}`).join('\n')
  )
  logFile.end()
}

function copyFiles() {
  console.log(' > [COPY] Copying files...')
  allFiles.forEach(({ elPath }) => {
    const destPath = elPath.replace(BACKUP_SRC, BACKUP_DEST)
    const destFolder = getFileContainer(destPath)
    console.log('DEST', destFolder)
    fs.mkdirSync(destFolder, { recursive: true })
    fs.copyFileSync(elPath, destPath)
  })
}

//cron.schedule('10 * * * * *', () => {
now = new Date()
console.log(`\n> [START BACKUP] ${now} \n`)
getConfig()
getLastBackupDate()
getNewAndModifiedFiles(BACKUP_SRC)
createLog()
copyFiles()
console.log('[BACKUP SUCCEDEED]\n')
//})