import fs from 'fs'

export const createFolder = (dirName: string) => {
  if (!fs.existsSync(dirName)) {
    console.info(`Folder ${dirName} was not found`)
    fs.mkdirSync(dirName)
    console.info(`Folder ${dirName} was created`)
  }
}

export const createFile = ({
  dirName,
  fileName,
  content,
}: {
  dirName: string
  fileName: string
  content: unknown
}) => {
  createFolder(dirName)
  fs.writeFileSync(dirName + '/' + fileName, `{"result": ${JSON.stringify(content, null, 2)}}`)
  console.info(`Content was written to ${dirName}/${fileName}`)
}
