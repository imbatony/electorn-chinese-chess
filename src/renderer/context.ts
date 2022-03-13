import { createContext } from "react";


export const BgmContext = createContext({
  on: true,
  type: "welcome",
  setType: (type: "welcome" | "board") => {
    console.log(type);
  },
  setBgmOn: (bgm: boolean) => {
    console.log(bgm);
  },
});
