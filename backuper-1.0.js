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
const filesToCopy = []
const elementsToDelete = []

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

const getNewAndModifiedFiles = (srcFolderPath) => {
  console.log('\n\n > [SEARCHING FILES] Searching files modified after last backup')
  
  console.log(' * Checking if SRC directory exists: ', srcFolderPath)
  try {
    fs.accessSync(srcFolderPath, fs.constants.R_OK | fs.constants.W_OK);
    console.log(" * SRC Directory exists.")
  } catch (err) {
    console.log(" ! SRC Directory does not exist.")
    return
  }

  const elements = fs.readdirSync(srcFolderPath)

  elements.forEach(el => {
    const elPath = `${srcFolderPath}/${el}`

    if (stats(elPath).isFile()) {
      //Check if is new or has been recently modified
      const modifiedTime = stats(elPath).mtime
      const modifiedParsed = new Date(modifiedTime).getTime()

      if (lastBackupDateParsed - modifiedParsed <= 24 * 60 * 60 * 1000) {
        filesToCopy.push({ modifiedTime, elPath })
      }

    } else if (stats(elPath).isDirectory() && !isExcluded(srcFolderPath)) {
      getNewAndModifiedFiles(elPath)
    }
  })
}

const getDeletedFiles = (destFolderPath) => {
  console.log('\n\n > [SEARCHING FILES] Searching deleted files')
  
  console.log(' * Checking if SRC directory exists: ', destFolderPath)
  try {
    fs.accessSync(destFolderPath, fs.constants.R_OK | fs.constants.W_OK);
    console.log(" * SRC Directory exists.")
  } catch (err) {
    console.log(" ! SRC Directory does not exist.")
    return
  }

  const elements = fs.readdirSync(destFolderPath)

  elements.forEach(el => {
    const destElementPath = `${destFolderPath}/${el}`
    const srcElementPath = destElementPath.replace(BACKUP_DEST, BACKUP_SRC)

    if(fs.existsSync(destElementPath) && !fs.existsSync(srcElementPath)){
      elementsToDelete.push(destElementPath)
    } else if (stats(destElementPath).isDirectory()) {
      getDeletedFiles(destElementPath)
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
  logFile.write('COPIED FILES:\n')
  logFile.write(
    filesToCopy.map(f => `${f.modifiedTime} - ${f.elPath}`).join('\n')
  )
  logFile.write('\nDELETED FILES:\n')
  logFile.write(
    elementsToDelete.join('\n')
  ) 
  logFile.end()
}

function copyFiles() {
  console.log(' > [COPY] Copying files...')
  filesToCopy.forEach(({ elPath }) => {
    const destPath = elPath.replace(BACKUP_SRC, BACKUP_DEST)
    const destFolder = getFileContainer(destPath)
    console.log('DEST', destFolder)
    fs.mkdirSync(destFolder, { recursive: true })
    fs.copyFileSync(elPath, destPath)
  })
}

function deleteElements() {
  elementsToDelete.forEach(destElementPath => {
    if (stats(destElementPath).isFile()) {
      fs.unlinkSync(destElementPath)
    } else {
      fs.rmdirSync(destElementPath, { recursive: true });
    }
  })
}

//cron.schedule('10 * * * * *', () => {
now = new Date()
console.log(`\n> [START BACKUP] ${now} \n`)
getConfig()
getLastBackupDate()
getNewAndModifiedFiles(BACKUP_SRC)
getDeletedFiles(BACKUP_DEST)
copyFiles()
deleteElements()
// ToDo: control exceptions in order to complete the cycle and log completed actions
createLog()
console.log('[BACKUP SUCCEDEED]\n')
//})