import {
  CAASPageRef,
  Page,
  CAASPageBody,
  Body,
  CAASPageSection,
  Section,
  ObjectMap,
  CAASDataEntry,
} from "./types";

export const mapDataEntryValue = async (
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
      const data = await mapDataEntries(entry.value.formData, locale);
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
          data: await mapDataEntries(value.formData, locale),
        }))
      );
    default:
      console.log("Could not map value", entry);
      return null;
  }
};

export const mapDataEntries = async (
  entries: ObjectMap<CAASDataEntry>,
  locale: string
): Promise<ObjectMap<any>> => {
  const keys = Object.keys(entries || {});
  const result: ObjectMap<any> = {};
  for (let i = 0; i < keys.length; i++) {
    const entry = entries[keys[i]];
    const mappedValue = await mapDataEntryValue(entry, locale);
    result[keys[i]] = mappedValue;
  }
  return result;
};

export const mapPageSection = async (
  section: CAASPageSection,
  locale: string
): Promise<Section> => {
  const data = await mapDataEntries(section.formData, locale);
  const meta = await mapDataEntries(section.metaFormData, locale);
  return {
    id: section.identifier,
    previewId: [section.identifier, locale].join("."),
    sectionType: section.template.uid,
    data,
    meta,
  };
};

export const mapPageBody = async (
  body: CAASPageBody,
  locale: string
): Promise<Body> => {
  const children = await Promise.all(
    body.children.map((child) => mapPageSection(child, locale))
  );
  return {
    name: body.name,
    previewId: [body.identifier, locale].join("."),
    children,
  };
};

export const mapPage = async (
  pageRef: CAASPageRef,
  locale: string
): Promise<Page> => {
  const data = await mapDataEntries(pageRef.page.formData, locale);
  const meta = await mapDataEntries(pageRef.page.metaFormData, locale);
  const children = await Promise.all(
    pageRef.page.children.map((child) => mapPageBody(child, locale))
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
