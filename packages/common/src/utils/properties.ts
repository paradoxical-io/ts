/**
 * Returns the property name of an object as a string
 * @param name
 */
export const propertyOf = <TObj, X extends TObj = TObj>(name: keyof X) => name;

/**
 * Returns the property names of an object as strings
 * @param _obj
 */
export const propertiesOf =
  <TObj, X extends TObj = TObj>(_obj: X | undefined = undefined) =>
  <T extends keyof X>(name: T): T =>
    name;
