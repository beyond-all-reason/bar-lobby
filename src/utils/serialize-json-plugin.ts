import {
    CreateTableNode,
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

export class SerializeJsonPlugin implements KyselyPlugin {
    protected serializeParametersTransformer = new SerializeParametersTransformer();

    public transformQuery(args: PluginTransformQueryArgs): RootOperationNode {
        return this.serializeParametersTransformer.transformNode(args.node);
    }

    public async transformResult(args: PluginTransformResultArgs): Promise<QueryResult<UnknownRow>> {
        for (const row of args.result.rows) {
            for (const key in row) {
                if (this.serializeParametersTransformer.jsonCols.has(key)) {
                    row[key] = JSON.parse(row[key] as string);
                }
            }
        }
        return args.result;
    }
}

export class SerializeParametersTransformer extends OperationNodeTransformer {
    public jsonCols: Set<string> = new Set();

    protected readonly serializer = (parameter: unknown) => {
        if (parameter && typeof parameter === "object") {
            return JSON.stringify(parameter);
        }
        return parameter;
    };

    protected override transformCreateTable(node: CreateTableNode): CreateTableNode {
        for (const col of node.columns) {
            if (col.dataType.kind === "DataTypeNode" && col.dataType.dataType.startsWith("json")) {
                this.jsonCols.add(col.column.column.name);
            }
        }
        return node;
    }

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
