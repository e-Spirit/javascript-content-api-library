import { AxiosStatic } from "axios";

export interface NavigationItem {
  id: string;
  label: string;
  seoRoute: string;
  contentReference: string;
  visible: boolean;
  children: NavigationItem[] | null;
}

export interface NavigationStructureItem {
  id: string;
  children: NavigationStructureItem[];
}

export interface NavigationMapping<T> {
  [key: string]: T;
}

export type NavigationItemMapper<T> = (item: NavigationItem) => T;

export interface NavigationData<T = NavigationItem> {
  raw: NavigationItem;
  idMap: NavigationMapping<T>;
  pathMap: NavigationMapping<T>;
  structure: NavigationStructureItem[];
  data: T[];
}

export function generateMap<T>(
  item: NavigationItem,
  key: Exclude<keyof NavigationItem, "children">,
  map: NavigationMapping<T> = {},
  mapNavigationItem?: NavigationItemMapper<T>
): NavigationMapping<T> {
  const mapKey = item[key].toString();
  return {
    ...map,
    [mapKey]: mapNavigationItem ? mapNavigationItem(item) : item,
    ...(item.children || []).reduce(
      (result, child) => generateMap(child, key, result, mapNavigationItem),
      {}
    ),
  };
}

export function generateNavigationStructure(
  item: NavigationItem
): NavigationStructureItem {
  return {
    id: item.id,
    children: (item.children || [])
      .filter(({ visible }) => visible === true)
      .map((child) => generateNavigationStructure(child)),
  };
}

export function generateNavigationTree<T>(
  item: NavigationItem,
  mapNavigationItem?: NavigationItemMapper<T>
): T {
  const mappedItem = mapNavigationItem ? mapNavigationItem(item) : item;
  return {
    ...mappedItem,
    children: (item.children || [])
      .filter(({ visible }) => visible === true)
      .map((child) => generateNavigationTree(child, mapNavigationItem)),
  } as T;
}

export const mapNavigationStructure = (
  data: NavigationItem
): NavigationItem[] | null => {
  return data.children;
};

/**
 * Fetch page structure from navigation-service
 * @param url the url of the navigation-service
 * @param locale locale of language that should be fetched
 * @param mapNavigationItem You can pass this callback to directly map the generic NavigationItem to match your needed structure
 */
export async function fetchNavigation<T = NavigationItem>(
  axios: AxiosStatic,
  url: string,
  locale: string,
  mapNavigationItem?: NavigationItemMapper<T>
): Promise<NavigationData<T>> {
  // TODO: Should the depth be a parameter too?
  const response = await axios.get<NavigationItem>(
    `${url}?language=${locale}&depth=99`
  );
  if (response.status === 200) {
    return {
      idMap: generateMap<T>(response.data, "id", {}, mapNavigationItem),
      pathMap: generateMap<T>(response.data, "seoRoute", {}, mapNavigationItem),
      raw: response.data,
      structure: (response.data.children || []).map(
        generateNavigationStructure
      ),
      data: (response.data.children || []).map((item) =>
        generateNavigationTree<T>(item, mapNavigationItem)
      ),
    };
  }
  throw new Error(
    `Unable to fetch Navigation. HTTP response status=${response.status}, statusText="${response.statusText}"`
  );
}
