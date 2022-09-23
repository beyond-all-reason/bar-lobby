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

export class SerializePlugin implements KyselyPlugin {
    protected serializeTransformer = new SerializeParametersTransformer();

    public transformQuery(args: PluginTransformQueryArgs): RootOperationNode {
        return this.serializeTransformer.transformNode(args.node);
    }

    public async transformResult(args: PluginTransformResultArgs): Promise<QueryResult<UnknownRow>> {
        for (const row of args.result.rows) {
            for (const key in row) {
                if (this.serializeTransformer.jsonCols.has(key)) {
                    row[key] = JSON.parse(row[key] as string);
                } else if (this.serializeTransformer.dateCols.has(key)) {
                    const str = JSON.parse(row[key] as string);
                    if (!str || Number.isNaN(str)) {
                        row[key] = null;
                    } else {
                        row[key] = new Date(str);
                    }
                } else if (this.serializeTransformer.booleanCols.has(key)) {
                    row[key] = JSON.parse(row[key] as string);
                }
            }
        }
        return args.result;
    }
}

export class SerializeParametersTransformer extends OperationNodeTransformer {
    public jsonCols: Set<string> = new Set();
    public dateCols: Set<string> = new Set();
    public booleanCols: Set<string> = new Set();

    protected readonly serializer = (parameter: unknown) => {
        if (parameter !== null && parameter !== undefined && (typeof parameter === "object" || typeof parameter === "boolean")) {
            return JSON.stringify(parameter);
        }
        return parameter;
    };

    protected override transformCreateTable(node: CreateTableNode): CreateTableNode {
        for (const col of node.columns) {
            if (col.dataType.kind === "DataTypeNode") {
                if (col.dataType.dataType.startsWith("json")) {
                    this.jsonCols.add(col.column.column.name);
                } else if (col.dataType.dataType.startsWith("date")) {
                    this.dateCols.add(col.column.column.name);
                } else if (col.dataType.dataType === "boolean") {
                    this.booleanCols.add(col.column.column.name);
                }
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
