const fs = require('fs')
const stats = fs.lstatSync
const cron = require("node-cron")

const BACKUP_SRC = '/home/tork/Documentos/Proyectos'
const BACKUP_DEST = './BACKUPS-TEST'
const LOG_FOLDER = './logs'
const EXCLUDED_FOLDERS = [
  'node_modules',
  '.git'
]

let now = new Date()
const allFiles = []

function isExcluded(folderPath) {
  return EXCLUDED_FOLDERS.some(ef=>folderPath.includes(ef))
}

function getFileContainer(filePath) {
  const pathArray = filePath.split('/')
  pathArray.pop()
  return pathArray.join('/')
}

const getNewAndModifiedFiles = (folderPath) => {
  if(!fs.existsSync(BACKUP_SRC)){
    throw Error(`\n\n ! [${BACKUP_SRC}] Folder doesn't exist\n`)
  }

  const elements = fs.readdirSync(folderPath)

  elements.forEach(el => {
    const elPath = `${folderPath}/${el}`
    
    if (stats(elPath).isFile()) {
      const modifiedTime = stats(elPath).mtime
      const modifiedParsed = new Date(modifiedTime).getTime()
      const nowParsed = new Date().getTime()
      
      if(nowParsed - modifiedParsed <= 24*60*60*1000){
        allFiles.push({modifiedTime, elPath})
      }
    } else if (stats(elPath).isDirectory() && !isExcluded(folderPath)) {
      getNewAndModifiedFiles(elPath)
    } 
  })
}

function createLog() {
  const dateString = `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()}`
  const timeString = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`
  const logFolder = `${LOG_FOLDER}/${dateString}`

  fs.mkdirSync(logFolder, {recursive: true})
  // ToDo: create file error logger
  const lastBckpLogFile = fs.createWriteStream(`${LOG_FOLDER}/last_backup.txt`)
  lastBckpLogFile.on('error', e => console.log('\nERROR CREATING "LAST BACKUP" LOG FILE\n', e))
  lastBckpLogFile.write(now.toString())
  lastBckpLogFile.end()

  const logFile = fs.createWriteStream(`${logFolder}/${timeString}.txt`)
  logFile.on('error', e => console.log('\nERROR CREATING LOG FILE\n', e))
  logFile.write(
    allFiles.map(f => `${f.modifiedTime} - ${f.elPath}`).join('\n')
  )
  logFile.end()
}

function copyFiles() {
  allFiles.forEach(({elPath}) => {
    const destPath = elPath.replace(BACKUP_SRC, BACKUP_DEST)
    const destFolder = getFileContainer(destPath)
    console.log('DEST', destFolder)
    fs.mkdirSync(destFolder, {recursive: true})
    fs.copyFileSync(elPath, destPath )
  })
}

//cron.schedule('10 * * * * *', () => {
  now = new Date()
  console.log(`\n[START BACKUP] ${now}`)
  getNewAndModifiedFiles(BACKUP_SRC)
  createLog()
  copyFiles()
  console.log('[BACKUP SUCCEDEED]\n')
//})