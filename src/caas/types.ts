export interface ObjectMap<Value> {
  [key: string]: Value;
}

export interface CAASTemplate {
  fsType: string;
  name: string;
  displayName: string;
  identifier: string;
  uid: string;
  uidType: string;
}

export interface CAASPageSection {
  fsType: "Section";
  name: string;
  displayName: string;
  identifier: string;
  template: CAASTemplate;
  formData: ObjectMap<CAASDataEntry>;
  metaFormData: ObjectMap<CAASDataEntry>;
}

export interface CAASDatasetReference {
  fsType: "DatasetReference";
  target: {
    entityType: string;
    fsType: string;
    identifier: string;
    schema: string;
  };
}

export type CAASPageBodyContent = CAASPageSection | CAASDatasetReference;

export interface CAASPageBody {
  fsType: "Body";
  name: string;
  identifier: string;
  children: CAASPageBodyContent[];
}

export interface CAASPage {
  fsType: "Page";
  name: string;
  displayName: string;
  identifier: string;
  uid: string;
  uidType: "PAGESTORE";
  template: CAASTemplate;
  formData: ObjectMap<CAASDataEntry>;
  metaFormData: ObjectMap<CAASDataEntry>;
  children: CAASPageBody[];
}

export interface CAASPageRef {
  _id: string;
  fsType: string;
  name: string;
  displayName: string;
  identifier: string;
  uid: string;
  uidType: string;
  metaFormData: ObjectMap<CAASDataEntry>;
  page: CAASPage;
  previewId: string;
}

export interface CMSInputNumber {
  fsType: "CMS_INPUT_NUMBER";
  name: string;
  value: number;
}
export interface CMSInputText {
  fsType: "CMS_INPUT_TEXT";
  name: string;
  value: string;
}
export interface CMSInputToggle {
  fsType: "CMS_INPUT_TOGGLE";
  name: string;
  value: boolean;
}
export interface CMSInputList<Type = any> {
  fsType: "CMS_INPUT_LIST";
  name: string;
  value: Type[];
}
export interface CMSInputLink {
  fsType: "CMS_INPUT_LINK";
  name: string;
  value: {
    template: CAASTemplate;
    formData: ObjectMap<CAASDataEntry>;
  } | null;
}
export interface CMSInputTextarea {
  fsType: "CMS_INPUT_TEXTAREA";
  name: string;
  value: string;
}
export interface CMSInputDOM {
  fsType: "CMS_INPUT_DOM";
  name: string;
  /**
   * This can contain html
   */
  value: string;
}
export interface CMSInputCombobox {
  fsType: "CMS_INPUT_COMBOBOX";
  name: string;
  value: {
    fsType: "Option";
    label: string;
    identifier: string;
  } | null;
}
export interface CMSInputDate {
  fsType: "CMS_INPUT_DATE";
  name: string;
  value: string;
}
export interface FSMarkdown {
  fsType: "FS_MARKDOWN";
  name: string;
  value: string;
}
export interface FSReference {
  fsType: "FS_REFERENCE";
  name: string;
  // TODO: Define correct type
  value:
    | null
    | {
        fsType: "Media";
        name: string;
        identifier: string;
        uid: string;
        url: string;
        previewId?: string;
        mediaType: string;
      }
    | {
        fsType: "PageRef";
        name: string;
        identifier: string;
        uid: string;
        url: string;
        previewId?: string;
      };
}
export interface FSButton {
  fsType: "FS_BUTTON";
  name: string;
  value: {} | null;
}
export interface FSCatalog {
  fsType: "FS_CATALOG";
  name: string;
  value: FSCard[] | null;
}
export interface FSDataset {
  fsType: "FS_DATASET";
  name: string;
  value: {
    fsType: "DatasetReference";
    target: {
      fsType: "Dataset";
      schema: string;
      entityType: string;
      identifier: string;
    };
    url: string;
  } | null;
}
export interface FSCard {
  fsType: "Card";
  identifier: string;
  uuid: string;
  template: CAASTemplate;
  formData: ObjectMap<CAASDataEntry>;
}
export interface FSIndex<Type = any> {
  fsType: "FS_INDEX";
  name: string;
  dapType: string;
  value: Type[] | null;
}

export type CAASDataEntry =
  | CMSInputNumber
  | CMSInputText
  | CMSInputToggle
  | CMSInputList
  | CMSInputDOM
  | CMSInputTextarea
  | CMSInputLink
  | CMSInputCombobox
  | CMSInputDate
  | FSReference
  | FSButton
  | FSCatalog
  | FSDataset
  | FSIndex
  | FSMarkdown;

export interface Page {
  id: string;
  refId: string;
  previewId: string;
  name: string;
  displayName: string;
  layout: string;
  children: Body[];
  data: ObjectMap<any>;
  meta: ObjectMap<any>;
}

export interface Body {
  previewId: string;
  name: string;
  children: BodyContent[];
}

export type BodyContent = Section | DatasetReference;

export interface Section<Data = ObjectMap<any>, Meta = ObjectMap<any>> {
  id: string;
  type: "Section";
  previewId: string;
  sectionType: string;
  data: Data;
  meta: Meta;
}

export interface DatasetReference {
  id: string;
  previewId: string;
  type: "DatasetReference";
  entityType: string;
  schema: string;
}

export interface Fragment {
  data: ObjectMap<any>;
  meta: ObjectMap<any>;
  previewId: string;
  type: string;
  id: string;
}

export interface GCAPage<Data = {}, Meta = {}> {
  id: string;
  name: string;
  uid: string;
  data: Data;
  meta: Meta;
}

export interface CAASGCAPage {
  _id: string;
  fsType: "GCAPage";
  name: string;
  uid: string;
  template: CAASTemplate;
  formData: ObjectMap<CAASDataEntry>;
  metaData: ObjectMap<CAASDataEntry>;
}

export interface CAASGCAPageResponse {
  _embedded: {
    "rh:doc": CAASGCAPage[];
  };
}

export interface CAASImageReference {
  identifier: string;
  previewId: string;
  resolutions: ObjectMap<{
    extension: string;
    fileSize: number;
    height: number;
    width: number;
    mimeType: string;
    url: string;
  }>;
}
