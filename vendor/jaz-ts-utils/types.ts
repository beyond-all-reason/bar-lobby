export type Exclusive<A extends object, B extends object> = Omit<A, keyof B> & Omit<B, keyof A>;
export type Inclusive<A extends object, B extends object> = Omit<A & B, keyof Exclusive<A, B>>;
export type Merge<A extends object, B extends object> = Inclusive<A, B> & Partial<Exclusive<A, B>>;

export type OptionalPropertiesOf<T extends object> = Exclude<{ [K in keyof T]: T extends Record<K, T[K]> ? never : K }[keyof T], undefined>;
export type Optionals<T extends object> = Required<Pick<T, OptionalPropertiesOf<T>>>;

export type Writable<T> = { -readonly [P in keyof T]: T[P] };
export type DeepWritable<T> = { -readonly [P in keyof T]: DeepWritable<T[P]> };

export type DeepPartial<T> = { [P in keyof T]?: DeepPartial<T[P]> };

export type ImmutablePrimitive = undefined | null | boolean | string | number | Function;

export type Immutable<T> = T extends ImmutablePrimitive
    ? T
    : T extends Array<infer U>
      ? ImmutableArray<U>
      : T extends Map<infer K, infer V>
        ? ImmutableMap<K, V>
        : T extends Set<infer M>
          ? ImmutableSet<M>
          : ImmutableObject<T>;

export type ImmutableArray<T> = ReadonlyArray<Immutable<T>>;
export type ImmutableMap<K, V> = ReadonlyMap<Immutable<K>, Immutable<V>>;
export type ImmutableSet<T> = ReadonlySet<Immutable<T>>;
export type ImmutableObject<T> = { readonly [K in keyof T]: Immutable<T[K]> };
export type DeepReadonly<T> = ImmutableObject<T>;

export type ExcludeMethods<T> = Pick<T, { [K in keyof T]: T[K] extends Function ? never : K }[keyof T]>;

export type SetUndefinedValues<T> = { [K in keyof T]?: T[K] | undefined }; // TODO: move to jaz-ts-utils

export type RemoveField<T, K extends string> = T extends { [P in K]: any } ? Omit<T, K> : never;

export type NeverKeys<T> = {
    [K in keyof T]: T[K] extends never ? K : never;
}[keyof T];

export type NonNeverKeys<T> = {
    [K in keyof T]: T[K] extends never ? never : K;
}[keyof T];
