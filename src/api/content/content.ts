import { AbstractContentAPI } from "@/api/content/abstract-content-api";
import { AiContentAPI } from "@/api/content/ai-content";
import { EngineContentAPI } from "@/api/content/engine-content";
import { GameContentAPI } from "@/api/content/game-content";
import { MapContentAPI } from "@/api/content/map-content";

export class ContentAPI extends AbstractContentAPI {
    public engine: EngineContentAPI;
    public game: GameContentAPI;
    public maps: MapContentAPI;
    public ai: AiContentAPI;

    constructor(userDataDir: string, dataDir: string) {
        super(userDataDir, dataDir);

        this.engine = new EngineContentAPI(userDataDir, dataDir);
        this.game = new GameContentAPI(userDataDir, dataDir);
        this.maps = new MapContentAPI(userDataDir, dataDir);
        this.ai = new AiContentAPI(userDataDir, dataDir);
    }

    public async init() {
        return this;
    }
}
