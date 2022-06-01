import { ipcRenderer } from "electron";
import { Signal } from "jaz-ts-utils";

export class UtilsAPI {
    public readonly onRightClick = new Signal();
    public readonly onLeftClick = new Signal();

    public highlightTaskbarIcon(flash = true) {
        return ipcRenderer.invoke("highlightTaskbarIcon", flash);
    }
}
