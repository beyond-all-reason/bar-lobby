declare module "zod" {
    export const z: any;
    export type ZodType<T = any> = any;
    export type ZodObject<T = any> = any;
    export type ZodString = any;
    export type ZodNumber = any;
    export type ZodBoolean = any;
    export type ZodArray<T = any> = any;
    export type ZodRecord<K = any, V = any> = any;
    export type ZodEnum<T = any> = any;
    export type ZodUnion<T = any> = any;
    export type ZodIntersection<T = any, U = any> = any;
    export type ZodTuple<T = any> = any;
    export type ZodNullable<T = any> = any;
    export type ZodOptional<T = any> = any;
    export type ZodDefault<T = any> = any;
    export type ZodEffects<T = any> = any;
    export type ZodLiteral<T = any> = any;
    export type ZodNever = any;
    export type ZodAny = any;
    export type ZodUnknown = any;
    export type ZodNull = any;
    export type ZodUndefined = any;
    export type ZodVoid = any;
    export type ZodPromise<T = any> = any;
    export type ZodDate = any;
    export type ZodNaN = any;
    export type ZodBigInt = any;
    export type ZodFunction<Args = any, Returns = any> = any;
    export type ZodLazy<T = any> = any;
    export type ZodReadonly<T = any> = any;
    export type ZodBranded<T = any, B = any> = any;
    export type ZodPipeline<A = any, B = any> = any;
    export type ZodTypeAny = any;
    export type ZodFirstPartyTypeKind = any;
    export type ZodSchema<T = any> = any;
    export type infer<T extends ZodType> = any;
}

declare module "zod-to-json-schema" {
    export function zodToJsonSchema(schema: any, name?: string): any;
}
