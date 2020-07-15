import { fetchNavigation, NavigationData } from "./navigation";
import { fetchPage } from "./caas";
import { Page, ObjectMap, Fragment, GCAPage } from "./caas/types";
import { fetchFragment } from "./caas/fragment";
import { fetchGCAPages } from "./caas/page";
import axios, { AxiosStatic } from "axios";

export interface FSXAConfiguration {
  apiKey: string;
  navigationService: string;
  caas: string;
  projectId: string;
  mode: "release" | "preview";
  remotes?: ObjectMap<string>;
}

export interface FragmentPayload {
  id: string;
  remote: string;
}

const ERROR_MISSING_CONFIG =
  "Please specify a FSXAConfiguration via constructor or setConfiguration";

export default class FSXAApi {
  protected axios: AxiosStatic = axios;
  protected config?: FSXAConfiguration;

  constructor(axiosToUse: AxiosStatic, config?: FSXAConfiguration) {
    this.config = config;
    this.axios = axiosToUse;
  }

  async fetchNavigation(locale: string): Promise<NavigationData | null> {
    if (!this.config)
      throw new Error(
        "Please specify a FSXAConfiguration via constructor or setConfiguration",
      );
    return fetchNavigation(
      this.axios,
      `${this.config.navigationService}/${this.config.mode}.${this.config.projectId}`,
      locale,
    );
  }

  async fetchPage(pageId: string, locale: string): Promise<Page | null> {
    if (!this.config) throw new Error(ERROR_MISSING_CONFIG);
    return fetchPage({
      axiosToUse: this.axios,
      apiKey: this.config.apiKey,
      locale,
      uri: `${this.config.caas}/${this.config.projectId}/${this.config.mode}.content/${pageId}.${locale}`,
    });
  }

  async fetchGCAPage(locale: string, uid: string): Promise<GCAPage | null> {
    if (!this.config) throw new Error(ERROR_MISSING_CONFIG);
    const response = await fetchGCAPages({
      axiosToUse: this.axios,
      uri: `${this.config.caas}/${this.config.projectId}/${this.config.mode}.content`,
      apiKey: this.config.apiKey,
      locale,
      uid,
    });
    return response[0];
  }

  async fetchGCAPages(locale: string, uid?: string): Promise<GCAPage[]> {
    if (!this.config) throw new Error(ERROR_MISSING_CONFIG);
    return fetchGCAPages({
      axiosToUse: this.axios,
      uri: `${this.config.caas}/${this.config.projectId}/${this.config.mode}.content`,
      apiKey: this.config.apiKey,
      locale,
      uid,
    });
  }

  async fetchFragments(
    fragments: FragmentPayload[],
    locale: string,
  ): Promise<Array<Fragment | null>> {
    if (!this.config) throw new Error(ERROR_MISSING_CONFIG);
    return await Promise.all(
      fragments.map((fragment) =>
        this.fetchFragment(fragment.id, fragment.remote, locale),
      ),
    );
  }

  async fetchFragment(
    fragmentId: string,
    remote: string,
    locale: string,
  ): Promise<Fragment | null> {
    if (!this.config) throw new Error(ERROR_MISSING_CONFIG);
    const projectId = this.config.remotes ? this.config.remotes[remote] : null;
    if (!projectId)
      throw new Error(
        `Could not find projectId for given remote: ${remote}. Please check your provided remotes configuration.`,
      );
    return fetchFragment({
      axiosToUse: this.axios,
      apiKey: this.config.apiKey,
      uri: `${this.config.caas}/${projectId}/${this.config.mode}.content`,
      locale,
      fragmentId,
    });
  }

  setConfiguration(fsxaConfiguration: FSXAConfiguration): void {
    this.config = fsxaConfiguration;
  }

  getConfiguration(): FSXAConfiguration | undefined {
    return this.config;
  }
}

export * from "./navigation";
export * from "./caas/types";
