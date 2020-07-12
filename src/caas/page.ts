import { Page, CAASPageRef, GCAPage, CAASGCAPageResponse } from "./types";
import { mapPage, getAxiosHeaders, mapDataEntries } from "./utils";
import { AxiosStatic } from "axios";

export interface FetchPageParams {
  axiosToUse: AxiosStatic;
  uri: string;
  locale: string;
  apiKey: string;
}
export async function fetchPage({
  axiosToUse,
  apiKey,
  locale,
  uri,
}: FetchPageParams): Promise<Page | null> {
  try {
    const response = await axiosToUse.get<CAASPageRef>(uri, {
      headers: { Authorization: `apikey="${apiKey}"` },
    });
    if (response.status === 200) {
      // map response
      return await mapPage(response.data, locale, axiosToUse, apiKey);
    }
  } catch (error) {
    console.log("Error fetching Page", error);
    return null;
  }
  return null;
}

export interface FetchGCAPagesParams {
  axiosToUse: AxiosStatic;
  locale: string;
  apiKey: string;
  uri: string;
  uid?: string;
}
export async function fetchGCAPages({
  axiosToUse,
  uri,
  locale,
  apiKey,
  uid,
}: FetchGCAPagesParams): Promise<GCAPage[]> {
  try {
    const andFilter: any = [
      {
        fsType: {
          $eq: "GCAPage",
        },
      },
      {
        "locale.language": {
          $eq: locale.split("_")[0],
        },
      },
    ];
    if (uid) andFilter.unshift({ uid: { $eq: uid } });
    const response = await axiosToUse.get<CAASGCAPageResponse>(uri, {
      params: {
        filter: {
          $and: andFilter,
        },
      },
      headers: getAxiosHeaders(apiKey),
    });
    if (response.status === 200) {
      return await Promise.all(
        response.data._embedded["rh:doc"].map(async (gcaPage) => ({
          id: gcaPage._id,
          data: await mapDataEntries(
            gcaPage.formData,
            locale,
            axiosToUse,
            apiKey,
          ),
          meta: await mapDataEntries(
            gcaPage.metaData,
            locale,
            axiosToUse,
            apiKey,
          ),
          name: gcaPage.name,
          uid: gcaPage.uid,
        })),
      );
    }
    return [];
  } catch (error) {
    return [];
  }
}
