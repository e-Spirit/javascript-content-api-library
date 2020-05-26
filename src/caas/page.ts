import { AxiosStatic } from "axios";
import { Page, CAASPageRef } from "./types";
import { mapPage } from "./utils";

export interface FetchPageParams {
  axiosToUse: AxiosStatic;
  caasURI: string;
  pageId: string;
  locale: string;
  apiKey: string;
}
export async function fetchPage({
  axiosToUse,
  apiKey,
  caasURI,
  locale,
  pageId,
}: FetchPageParams): Promise<Page | null> {
  try {
    const response = await axiosToUse.get<CAASPageRef>(
      `${caasURI}/${pageId}.${locale}`,
      {
        headers: { Authorization: `apikey="${apiKey}"` },
      }
    );
    if (response.status === 200) {
      // map response
      return await mapPage(
        {
          axiosToUse,
          headers: { Authorization: `apikey="${apiKey}"` },
        },
        response.data,
        locale
      );
    }
  } catch (error) {
    throw new Error(error);
  }
  return null;
}
