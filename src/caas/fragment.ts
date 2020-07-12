import { getAxiosHeaders, mapDataEntries } from "./utils";
import { Fragment } from "./types";
import { AxiosStatic } from "axios";

export interface FetchFragmentParams {
  axiosToUse: AxiosStatic;
  apiKey: string;
  uri: string;
  locale: string;
  fragmentId: string;
}

export async function fetchFragment({
  axiosToUse,
  apiKey,
  uri,
  fragmentId,
  locale,
}: FetchFragmentParams): Promise<Fragment | null> {
  const response = await axiosToUse.get(uri, {
    headers: getAxiosHeaders(apiKey),
    params: {
      filter: {
        $and: [
          {
            "fragmentMetaData.id": {
              $eq: fragmentId.replace("-", "_"),
            },
          },
          {
            "metaFormData.language.value.identifier": {
              $eq: locale.split("_")[0].toUpperCase(),
            },
          },
        ],
      },
    },
  });
  if (response.status === 200) {
    try {
      const data = response.data._embedded["rh:doc"][0];
      return {
        data: mapDataEntries(data.formData, locale, axiosToUse, apiKey),
        meta: mapDataEntries(data.metaFormData, locale, axiosToUse, apiKey),
        previewId: data.previewId,
        id: fragmentId,
        type: data.template.uid,
      };
    } catch (error) {
      console.log("Error fetching fragment with id " + fragmentId, error);
      return null;
    }
  }
  return null;
}
