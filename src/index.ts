import { fetchNavigation, NavigationItem, NavigationData } from "./navigation";
import axios, { AxiosStatic } from "axios";
import { fetchPage } from "./caas";
import { Page } from "./caas/types";

export interface FSXAConfiguration {
  apiKey: string;
  locale: string;
  navigationService: string;
  caas: string;
}
export default class FSXAApi {
  protected config?: FSXAConfiguration;
  protected axios: AxiosStatic;

  constructor(axiosToUse?: AxiosStatic, config?: FSXAConfiguration) {
    this.axios = axiosToUse || axios;
    this.config = config;
  }

  async fetchNavigation<T = NavigationItem>(): Promise<NavigationData<T>> {
    if (!this.config)
      throw new Error(
        "Please specify a FSXAConfiguration via constructor or setConfiguration"
      );
    return fetchNavigation<T>(
      this.axios,
      this.config.navigationService,
      this.config.locale
    );
  }

  async fetchPage(pageId: string): Promise<Page | null> {
    if (!this.config)
      throw new Error(
        "Please specify a FSXAConfiguration via constructor or setConfiguration"
      );
    return fetchPage({
      apiKey: this.config.apiKey,
      axiosToUse: this.axios,
      caasURI: this.config.caas,
      locale: this.config.locale,
      pageId
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
