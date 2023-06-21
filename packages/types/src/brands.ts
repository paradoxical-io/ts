export type Brand<K, T> = K & { __brand: T };
export type SubBrand<T, Y> = T extends Brand<unknown, unknown> ? T & { __subBrand: Y } : never;

// general purpose brands
export type FullSSNString = Brand<string, 'FullSSNString'>;
export type PartialSSNString = Brand<string, 'PartialSSNString'>;
export type SSNString = FullSSNString | PartialSSNString;

/**
 * A structured tag
 */
export type Tag = Brand<string, 'Tag'>;

export type FirstName = Brand<string, 'FirstName'>;
export type LastName = Brand<string, 'LastName'>;
export type Email = Brand<string, 'Email'>;

/**
 * An unparsed phone number. This may be in pretty format or e164 or otherwise
 */
export type PhoneNumber = Brand<string, 'PhoneNumber'>;

export type E164PhoneNumber = Brand<string, 'E164PhoneNumber'>;

export type AuthorizationDelegationPhoneNumber = SubBrand<E164PhoneNumber, 'AuthorizationDelegationPhoneNumber'>;

export type TwoFactorCode = Brand<string, 'TwoFactorCode'>;

/**
 * The magic demo mode number to log in with for app reveiwers
 */
export const DemoModeNumber = '+11115555555' as E164PhoneNumber;

/**
 * A base64 encoded string representing an image
 */
export type Base64Image = Brand<string, 'Base64Image'>;

export type Amount = Brand<number, 'Amount'>;

export type Points = SubBrand<Amount, 'Points'>;

export type PointsTransactionId = Brand<string, 'PointsTransactionId'>;

export type NewPointsTransactionId = SubBrand<PointsTransactionId, 'NewPointsTransactionId'>;

export type UserChoreId = Brand<string, 'UserChoreId'>;

/**
 * A string representing a base64 image url like: data:<mime>;charset=utf-8;base64...
 */
export type Base64ImageUri = Brand<string, 'Base64ImageUri'>;
export type PushToken = Brand<string, 'PushToken'>;
export type Password = Brand<string, 'Password'>;
export type SharedIdNames = 'userId';
export type CronString = Brand<string, 'CronString'>;
export type IdempotencyKey = Brand<string, 'IdempotencyKey'>;
export type RandomSeed = Brand<string, 'RandomSeed'>;
export type URL = Brand<string, 'URL'>;
export type IPAddress = Brand<string, 'IPAddress'>;

/**
 * The first initial of a name string
 */
export type Initial = Brand<string, 'Initial'>;

// time brands
export type Milliseconds = Brand<number, 'Milliseconds'>;
export type Seconds = Brand<number, 'Seconds'>;
export type Minutes = Brand<number, 'Minutes'>;
export type Hours = Brand<number, 'Hours'>;
export type Days = Brand<number, 'Days'>;

// fractional percentage between 0 and 1
export type Percent = Brand<number, 'Percent'>;

export type Sha = Brand<string, 'Sha'>;

// user agent string
export type UserAgent = Brand<string, 'UserAgent'>;
