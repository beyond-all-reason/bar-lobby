import { AbstractContentAPI } from "@/api/content/abstract-content";
import { MapContentAPI } from "@/api/content/map-content";
import { EngineContentAPI } from "@/api/content/engine-content";
import { GameContentAPI } from "@/api/content/game-content";

export class ContentAPI extends AbstractContentAPI {
    public engine: EngineContentAPI;
    public game: GameContentAPI;
    public maps: MapContentAPI;

    constructor(userDataDir: string, dataDir: string) {
        super(userDataDir, dataDir);

        this.engine = new EngineContentAPI(userDataDir, dataDir);
        this.game = new GameContentAPI(userDataDir, dataDir);
        this.maps = new MapContentAPI(userDataDir, dataDir);
    }

    public async init() {
        await this.engine.init();
        await this.game.init();
        await this.maps.init();

        return this;
    }
}