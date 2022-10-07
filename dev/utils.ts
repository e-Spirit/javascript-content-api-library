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
  fs.writeFileSync(dirName + '/' + fileName, `{"result": ${JSON.stringify(content, getCircularReplacer(), 2)}}`)
  console.info(`Content was written to ${dirName}/${fileName}`)
}

const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (_: unknown, value: any) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return `[Circular->{${value.id || value._id}]}`;
      }
      seen.add(value);
    }
    return value;
  };
};

