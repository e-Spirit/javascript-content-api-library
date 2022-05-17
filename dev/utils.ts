import fs from 'fs'

export const createFolder = (dirName: string, recursive?: boolean) => {
  if (!fs.existsSync(dirName)) {
    console.info(`Folder ${dirName} was not found`)
    fs.mkdirSync(dirName, { recursive })
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
  createFolder(dirName, true)
  fs.writeFileSync(dirName + '/' + fileName, `{"result": ${JSON.stringify(content, null, 2)}}`)
  console.info(`Content was written to ${dirName}/${fileName}`)
}
