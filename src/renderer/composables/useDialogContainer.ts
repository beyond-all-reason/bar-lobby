/* eslint-disable @typescript-eslint/no-explicit-any */

// https://github.com/auswuchs/vue-dialog/tree/main

import { Component, markRaw, reactive, Ref } from "vue";

import type { ComponentProps } from "@/composables/useDialog";

export type UseDialogContainerReturn = {
    dialogsStore: DialogData<any>[];
    addDialog: (dialogData: DialogData<any>) => void;
    removeDialog: (id: number) => void;
    removeAll: () => void;
};

export type DialogData<C extends Component> = {
    id: number;
    dialog: C;
    isRevealed: Ref<boolean>;
    revealed: Ref<boolean>;
    props: ComponentProps<C>;
    confirm: (props?: ComponentProps<C>) => void;
    cancel: (props?: ComponentProps<C>) => void;
    close: () => void;
};

const dialogsStore: DialogData<any>[] = reactive([]);

export function useDialogContainer(): UseDialogContainerReturn {
    function addDialog(dialogData: DialogData<any>) {
        dialogsStore.push(markRaw(dialogData));
    }

    function removeDialog(id: number) {
        const index = dialogsStore.findIndex((dialog) => dialog.id == id);
        dialogsStore.splice(index, 1);
    }

    function removeAll() {
        dialogsStore.splice(0);
    }

    return {
        dialogsStore,
        addDialog,
        removeDialog,
        removeAll,
    };
}
