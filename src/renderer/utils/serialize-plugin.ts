import {
    Kysely,
    KyselyPlugin,
    OperationNodeTransformer,
    PluginTransformQueryArgs,
    PluginTransformResultArgs,
    PrimitiveValueListNode,
    QueryResult,
    RootOperationNode,
    UnknownRow,
    ValueNode,
} from "kysely";

export class SerializePlugin implements KyselyPlugin {
    protected serializeTransformer = new SerializeParametersTransformer();
    /** hacky because will break with cols of same name but different types. no solution for this because transformResult doesn't say which table cols come from */
    protected colTypes = new Map<string, "json" | "datetime" | "boolean">();

    public async setSchema(db: Kysely<unknown>) {
        const tableMetadata = await db.introspection.getTables();
        for (const table of tableMetadata) {
            for (const col of table.columns) {
                if (col.dataType === "json") {
                    this.colTypes.set(col.name, "json");
                } else if (col.dataType === "datetime") {
                    this.colTypes.set(col.name, "datetime");
                } else if (col.dataType === "boolean") {
                    this.colTypes.set(col.name, "boolean");
                }
            }
        }
    }

    public transformQuery(args: PluginTransformQueryArgs): RootOperationNode {
        return this.serializeTransformer.transformNode(args.node);
    }

    public async transformResult(args: PluginTransformResultArgs): Promise<QueryResult<UnknownRow>> {
        for (const row of args.result.rows) {
            for (const key in row) {
                const colType = this.colTypes.get(key);
                if (colType === "json" || colType === "boolean") {
                    row[key] = JSON.parse(row[key] as string);
                } else if (colType === "datetime") {
                    const str = JSON.parse(row[key] as string);
                    if (!str || Number.isNaN(str)) {
                        row[key] = null;
                    } else {
                        row[key] = new Date(str);
                    }
                }
            }
        }
        return args.result;
    }
}

export class SerializeParametersTransformer extends OperationNodeTransformer {
    protected readonly serializer = (parameter: unknown) => {
        if (parameter !== null && (typeof parameter === "object" || typeof parameter === "boolean")) {
            return JSON.stringify(parameter);
        }
        return parameter;
    };

    protected override transformPrimitiveValueList(node: PrimitiveValueListNode): PrimitiveValueListNode {
        return {
            ...node,
            values: node.values.map(this.serializer),
        };
    }

    protected override transformValue(node: ValueNode): ValueNode {
        return {
            ...node,
            value: this.serializer(node.value),
        };
    }
}
