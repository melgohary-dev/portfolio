import { nanoid } from "nanoid";

/** Create a namespaced unique id, e.g. createId("msg") -> "msg_ab12..." */
export function createId(prefix: string): string {
  return `${prefix}_${nanoid(10)}`;
}
