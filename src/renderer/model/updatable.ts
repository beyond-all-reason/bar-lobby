import { DeepPartial } from "jaz-ts-utils";
import { DeepReadonly, reactive, readonly, UnwrapNestedRefs } from "vue";

export abstract class Updatable<Data extends object, UpdateData extends object> {
    public data: DeepReadonly<UnwrapNestedRefs<UnwrapNestedRefs<Data>>>;

    protected mutableData: UnwrapNestedRefs<Data>;
    protected updateHandlers: { [K in keyof UpdateData]: (data: UpdateData[K]) => void };

    constructor(response: UpdateData, defaultConfig: Data, updateHandlers: (data: UnwrapNestedRefs<Data>) => { [K in keyof UpdateData]: (data: UpdateData[K]) => void }) {
        this.mutableData = reactive(defaultConfig);

        this.data = readonly(this.mutableData);

        this.updateHandlers = updateHandlers(this.mutableData);

        this.update(response);
    }

    public update(data: DeepPartial<UpdateData>) {
        for (const key in data) {
            const handler = this.updateHandlers[key] as (data: unknown) => void;
            handler(data[key]);
        }
    }
}
