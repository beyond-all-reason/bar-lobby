import type { SessionType} from "@/model/session";
import { sessionSchema } from "@/model/session";
import Ajv from "ajv";
import { Signal } from "jaz-ts-utils";
import { reactive } from "vue";

export class SessionAPI {
    public model: SessionType;
    public onRightClick = new Signal();
    public onLeftClick = new Signal();

    constructor() {
        const ajv = new Ajv({ coerceTypes: true, useDefaults: true });
        const sessionValidator = ajv.compile(sessionSchema);
        const model = reactive({}) as SessionType;
        sessionValidator(model);

        this.model = reactive(model);
    }
}