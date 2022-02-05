import { SessionType, sessionSchema } from "@/model/session";
import Ajv from "ajv";
import { reactive, ToRefs, toRefs } from "vue";

export class SessionAPI {
    public model: ToRefs<SessionType>;

    constructor() {
        const ajv = new Ajv({ coerceTypes: true, useDefaults: true });
        const sessionValidator = ajv.compile(sessionSchema);
        const model = reactive({}) as SessionType;
        sessionValidator(model);

        this.model = toRefs(model);
    }
}