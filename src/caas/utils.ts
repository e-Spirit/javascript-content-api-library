import {
  CAASPageRef,
  Page,
  CAASPageBody,
  Body,
  CAASPageSection,
  Section,
  ObjectMap,
  CAASDataEntry,
  Resolutions,
} from "./types";
import { AxiosStatic } from "axios";

export interface AxiosConfig {
  axiosToUse: AxiosStatic;
  headers: ObjectMap<string>;
}

export const mapDataEntryValue = async (
  config: AxiosConfig,
  entry: CAASDataEntry,
  locale: string
): Promise<any> => {
  switch (entry.fsType) {
    case "CMS_INPUT_NUMBER":
    case "CMS_INPUT_DOM":
    case "CMS_INPUT_TEXT":
    case "CMS_INPUT_TEXTAREA":
      return entry.value;
    case "CMS_INPUT_LINK":
      const data = await mapDataEntries(config, entry.value.formData, locale);
      return {
        layout: entry.value.template.uid,
        data,
      };
    case "CMS_INPUT_COMBOBOX":
      return entry.value;
    case "CMS_INPUT_TOGGLE":
      return entry.value || false;
    case "FS_DATASET":
      return {
        schema: entry.value.target.schema,
        identifier: entry.value.target.identifier,
        type: entry.value.target.entityType,
        url: entry.value.url,
      };
    case "FS_REFERENCE":
      if (
        entry.value?.fsType === "Media" &&
        entry.value.mediaType === "PICTURE"
      ) {
        const images = await fetchImages(config, entry.value.url);
        console.log("Fetched Images", images);
      }
      return entry.value
        ? {
            referenceType: entry.value.fsType === "Media" ? "media" : "blakeks",
            previewId: entry.value.previewId,
            uid: entry.value.uid,
          }
        : null;
    case "FS_CATALOG":
      return await Promise.all(
        entry.value.map(async (value) => ({
          previewId: [value.identifier, locale].join("."),
          identifier: value.identifier,
          data: await mapDataEntries(config, value.formData, locale),
        }))
      );
    default:
      console.log("Could not map value", entry);
      return null;
  }
};

export const mapDataEntries = async (
  config: AxiosConfig,
  entries: ObjectMap<CAASDataEntry>,
  locale: string
): Promise<ObjectMap<any>> => {
  const keys = Object.keys(entries || {});
  const result: ObjectMap<any> = {};
  for (let i = 0; i < keys.length; i++) {
    const entry = entries[keys[i]];
    const mappedValue = await mapDataEntryValue(config, entry, locale);
    result[keys[i]] = mappedValue;
  }
  return result;
};

export const mapPageSection = async (
  config: AxiosConfig,
  section: CAASPageSection,
  locale: string
): Promise<Section> => {
  const data = await mapDataEntries(config, section.formData, locale);
  const meta = await mapDataEntries(config, section.metaFormData, locale);
  return {
    id: section.identifier,
    previewId: [section.identifier, locale].join("."),
    sectionType: section.template.uid,
    data,
    meta,
  };
};

export const mapPageBody = async (
  config: AxiosConfig,
  body: CAASPageBody,
  locale: string
): Promise<Body> => {
  const children = await Promise.all(
    body.children.map((child) => mapPageSection(config, child, locale))
  );
  return {
    name: body.name,
    previewId: [body.identifier, locale].join("."),
    children,
  };
};

export const fetchImages = async (
  config: AxiosConfig,
  url: string,
  resolutions: Resolutions[] = Object.keys(Resolutions) as Resolutions[]
): Promise<ObjectMap<string>> => {
  const result: ObjectMap<string> = {};
  const images = await Promise.all(
    resolutions.map((resolution) =>
      fetchImage(config, url.replace(/ORIGINAL$/, resolution))
    )
  );
  for (let i = 0; i < resolutions.length; i++)
    result[resolutions[i]] = images[i];
  return result;
};

export const fetchImage = async (
  config: AxiosConfig,
  url: string
): Promise<string> => {
  const result = await config.axiosToUse.get(url, {
    responseType: "blob",
    timeout: 3000,
    headers: config.headers,
  });
  console.log("FETCHED IMAGE");
  return URL.createObjectURL(result);
};

export const mapPage = async (
  config: AxiosConfig,
  pageRef: CAASPageRef,
  locale: string
): Promise<Page> => {
  const data = await mapDataEntries(config, pageRef.page.formData, locale);
  const meta = await mapDataEntries(config, pageRef.page.metaFormData, locale);
  const children = await Promise.all(
    pageRef.page.children.map((child) => mapPageBody(config, child, locale))
  );
  return {
    id: pageRef.page.identifier,
    refId: pageRef.identifier,
    previewId: [pageRef.page.identifier, locale].join("."),
    name: pageRef.page.name,
    displayName: pageRef.page.displayName,
    layout: pageRef.page.template.uid,
    children,
    data,
    meta,
  };
};
