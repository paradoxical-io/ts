export interface JsonObject {
  [key: string]: JsonValue;
}
export interface JsonArray extends Array<JsonValue> {}
export type JsonValue = string | number | boolean | null | undefined | JsonObject | JsonArray;
