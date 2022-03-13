import {
  CaaSApi_CMSImageMap,
  CaaSApi_ImageMapAreaCircle,
  CaaSApi_ImageMapAreaPoly,
  CaaSApi_ImageMapAreaRect,
  Point2D,
} from '../types'
import faker from 'faker'
import { createImageMapMedia } from './createImageMapMedia'
import { ImageMapAreaType } from '../enums'

export function createImageMap(): CaaSApi_CMSImageMap {
  const media = createImageMapMedia()
  const createPoint2D = (): Point2D => ({
    x: faker.datatype.number(5),
    y: faker.datatype.number(5),
  })

  return {
    name: faker.random.word(),
    fsType: 'CMS_INPUT_IMAGEMAP',
    value: {
      fsType: 'MappingMedium',
      media,
      areas: [
        {
          fsType: 'Area',
          link: {
            formData: {},
            template: {},
          },
          areaType: ImageMapAreaType.CIRCLE,
          radius: faker.datatype.number(5),
          center: createPoint2D(),
        } as CaaSApi_ImageMapAreaCircle,
        {
          fsType: 'Area',
          link: {
            formData: {},
            template: {},
          },
          areaType: ImageMapAreaType.RECT,
          leftTop: createPoint2D(),
          rightBottom: createPoint2D(),
        } as CaaSApi_ImageMapAreaRect,
        {
          fsType: 'Area',
          link: {
            formData: {},
            template: {},
          },
          areaType: ImageMapAreaType.POLY,
          points: [createPoint2D(), createPoint2D(), createPoint2D()],
        } as CaaSApi_ImageMapAreaPoly,
      ],
      resolution: {
        fsType: 'Resolution',
        uid: faker.datatype.uuid(),
        width: 1920,
        height: 1080,
      },
    },
  }
}
