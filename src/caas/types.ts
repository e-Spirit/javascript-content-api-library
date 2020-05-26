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

export interface CAASPageBody {
  fsType: "Body";
  name: string;
  identifier: string;
  children: CAASPageSection[];
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
  };
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
  };
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
  value: {};
}
export interface FSCatalog {
  fsType: "FS_CATALOG";
  name: string;
  value: FSCard[];
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
  };
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
  value: Type[];
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
  | FSReference
  | FSButton
  | FSCatalog
  | FSDataset
  | FSIndex;

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
  children: Section[];
}

export interface Section<Data = ObjectMap<any>, Meta = ObjectMap<any>> {
  id: string;
  previewId: string;
  sectionType: string;
  data: Data;
  meta: Meta;
}

export enum Resolutions {
  ORIGINAL = "ORIGINAL",
  product_detail = "product_detail",
  header_banner = "header_banner",
  big_welcome_slider = "big_welcome_slider",
  product_teaser = "product_teaser",
  small_blog_picture = "small_blog_picture",
  big_blog_picture = "big_blog_picture",
  experts_picture_small = "experts_picture_small",
  experts_picture_big = "experts_picture_big",
  carousel_picture = "carousel_picture",
  post_detail_picture = "post_detail_picture",
  gallery_pictures_small = "gallery_pictures_small",
  echo_show5 = "echo_show5",
  echo_spot = "echo_spot",
  interesting_facts_banner = "interesting_facts_banner",
  header_banner_mobile = "header_banner_mobile",
}
