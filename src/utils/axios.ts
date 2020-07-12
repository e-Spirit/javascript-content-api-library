import axiosOriginal from "axios";
// eslint-disable-next-line
// @ts-ignore
import xhrAdapter from "axios/lib/adapters/xhr";
// eslint-disable-next-line
// @ts-ignore
import httpAdapter from "axios/lib/adapters/http";

const isNode =
  typeof process !== "undefined" &&
  process.versions != null &&
  process.versions.node != null;

export default axiosOriginal.create({
  adapter: isNode ? httpAdapter : xhrAdapter,
});
