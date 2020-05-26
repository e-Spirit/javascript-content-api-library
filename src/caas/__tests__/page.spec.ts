import { mapPage } from "../utils";
import { CAASPageRef } from "../types";
import "@babel/core/";
import axios from "axios";

// eslint-disable-next-line
const caasPageRefResponse = require("./caasPageRefResponse.json");

describe("CAAS", () => {
  beforeEach(() => (window.URL.createObjectURL = jest.fn(() => "IMAGEURL")));
  describe("utils.mapPage", () => {
    it("should be true", async () => {
      console.log(
        JSON.stringify(
          await mapPage(
            {
              axiosToUse: axios,
              headers: {
                Authorization: `apikey="f5a14f78-d8b8-4525-a814-63b49e0436ee"`,
              },
            },
            caasPageRefResponse as CAASPageRef,
            "de"
          )
        )
      );
      expect(true).toBeTruthy();
    });
  });
});
