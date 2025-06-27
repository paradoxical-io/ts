import { Brand } from '@paradoxical-io/types';

export type XPath = Brand<string, 'XPath'>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Arrayable<T> = T extends any[] ? number : never;
type UnpackedArray<T> = T extends Array<infer U> ? U : T;

type NonNullRequired<T> = Required<Exclude<T, null>>;

export class XPathBuilder<T> {
  constructor(readonly path: XPath = '$' as XPath) {}

  /**
   * Adds a field to the path builder
   * @param k
   * @note The Typescript Required types are important here in order to work for nested objects with optional fields.
   *   Otherwise the next XPathBuilder type can't properly resolve the keys of the nested object (it can be either an object or undefined)
   */
  field<Key extends keyof NonNullRequired<T>>(k: Key): XPathBuilder<NonNullRequired<T>[Key]> {
    return new XPathBuilder<NonNullRequired<T>[Key]>(`${this.path}.${k.toString()}` as XPath);
  }

  /**
   * Adds an index lookup to the path builder
   * @param index
   * @note The Typescript Required types are important here in order to work for nested objects with optional fields.
   *   Otherwise the next XPathBuilder type can't properly resolve the keys of the nested object (it can be either an object or undefined)
   *   It's also necessary to unpack the array type to set the proper type on the next builder.
   */
  index(index: Arrayable<T>): XPathBuilder<Required<UnpackedArray<T>>> {
    return new XPathBuilder<Required<UnpackedArray<T>>>(`${this.path}[${index}]` as XPath);
  }
}

export function xpath<T>() {
  return new XPathBuilder<T>();
}
