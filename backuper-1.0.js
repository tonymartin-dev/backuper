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
const elementsToCopy = []
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

const getNewAndModifiedFiles = (srcFolderPath, folderModifiedParsed) => {
  console.log('\n\n > [SEARCHING FILES] Searching files modified after last backup')
  
  if(!folderExists(srcFolderPath)) {
    return
  }
 
  const elements = fs.readdirSync(srcFolderPath)

  if(!elements || !elements.length){
    console.log(`\n\n ! Empty folder: ${srcFolderPath}`)
    elementsToCopy.push({ modifiedTime: folderModifiedParsed, elPath: srcFolderPath })
    return
  }

  elements.forEach(el => {
    const elPath = `${srcFolderPath}/${el}`
    const modifiedTime = stats(elPath).mtime
    const modifiedParsed = new Date(modifiedTime).getTime()

    if (stats(elPath).isFile()) {

      //if (lastBackupDateParsed - modifiedParsed <= 24 * 60 * 60 * 1000) {
      if (modifiedParsed >= lastBackupDateParsed) {
        elementsToCopy.push({ modifiedTime, elPath })
      }

    } else if (stats(elPath).isDirectory() && !isExcluded(srcFolderPath)) {
      getNewAndModifiedFiles(elPath, modifiedParsed)
    }
  })
}

const getDeletedElements = (destFolderPath) => {
  console.log('\n\n > [SEARCHING FILES] Searching deleted files')
  
  if(!folderExists(destFolderPath)) {
    return
  }

  const elements = fs.readdirSync(destFolderPath)

  elements.forEach(el => {
    const destElementPath = `${destFolderPath}/${el}`
    const srcElementPath = destElementPath.replace(BACKUP_DEST, BACKUP_SRC)

    if(
      (fs.existsSync(destElementPath) && !fs.existsSync(srcElementPath)) ||
      (stats(destElementPath).isDirectory() && !stats(srcElementPath).isDirectory()) ||
      (!stats(destElementPath).isDirectory() && stats(srcElementPath).isDirectory())
    ){

      elementsToDelete.push(destElementPath)

    } else if (stats(destElementPath).isDirectory()) {

      getDeletedElements(destElementPath)

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
  logFile.write(`${now.toString()} backup \n\n`)
  logFile.write('COPIED FILES:\n')
  logFile.write(
    elementsToCopy.map(f => `  *  ${f.modifiedTime} - ${f.elPath}`).join('\n')
  )
  logFile.write('\n\nDELETED FILES:\n')
  logFile.write(
    elementsToDelete.map(e => `  *  ${e}`).join('\n')
  ) 
  logFile.end()
}

function copyElements() {
  console.log('\n\n > [COPY] Copying files...')
  if(!elementsToCopy.length){
    console.log('  * No elements to copy')
    return
  }
  elementsToCopy.forEach(({ elPath }) => {
    const destPath = elPath.replace(BACKUP_SRC, BACKUP_DEST)
    if(stats(elPath).isFile()){
      const destFolder = getFileContainer(destPath)
      console.log('  * ', `${elPath}  ==> ${destPath}`)
      fs.mkdirSync(destFolder, { recursive: true })
      fs.copyElementsync(elPath, destPath)
    } else if (stats(elPath).isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true })
    }
  })
}

function deleteElements() {
  console.log('\n\n > [DELETE] Deleting elements...')
  if(!elementsToDelete.length){
    console.log('  * No elements to delete')
    return
  }
  elementsToDelete.forEach(destElementPath => {
    console.log('  * ', destElementPath)
    if (stats(destElementPath).isFile()) {
      fs.unlinkSync(destElementPath)
    } else {
      fs.rmdirSync(destElementPath, { recursive: true });
    }
  })
}

function folderExists(folderPath) {
  console.log('  * Checking if SRC directory exists: ', folderPath)
  try {
    fs.accessSync(folderPath, fs.constants.R_OK | fs.constants.W_OK);
    console.log("  * SRC Directory exists.")
    return true
  } catch (err) {
    console.log("  ! SRC Directory does not exist.")
    return
  }
}

// ToDo: run script with params to decide whether it should run a cron or execute backup just once
//cron.schedule('10 * * * * *', () => {
now = new Date()
console.log(`\n> [START BACKUP] ${now} \n`)
getConfig()
getLastBackupDate()
getDeletedElements(BACKUP_DEST)
getNewAndModifiedFiles(BACKUP_SRC)
deleteElements()
copyElements()
// ToDo: control exceptions in order to complete the cycle and log completed actions
createLog()
console.log('[BACKUP SUCCEDEED]\n')
//})