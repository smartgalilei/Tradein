import merchants from "../merchants.json";
import type { Merchant } from "./types";

export const SINGLE_MERCHANT_ID = "m-test-amano-tokyo";
export const MERCHANT_EMAIL_WHITELIST = ["smartgalilei@gmail.com"];

export const SINGLE_MERCHANT = merchants.find(
  (merchant) => merchant.id === SINGLE_MERCHANT_ID
) as Merchant;

if (!SINGLE_MERCHANT) {
  throw new Error("Single merchant seed is missing from merchants.json");
}

export const APP_NAME = "Tradein";
