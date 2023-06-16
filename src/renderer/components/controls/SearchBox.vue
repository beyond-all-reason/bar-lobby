<template>
    <div v-bind="attrsStyles">
        <slot name="prepend"></slot>
        <slot v-if="searchIcon" name="search-icon">
            <i class="search-icon search"></i>
        </slot>
        <slot name="prepend-inner"></slot>
        <input
            ref="inputRef"
            type="search"
            data-search-input="true"
            :value="modelValue"
            v-bind="attrsWithoutStyles"
            @input="onInput"
            @focus="hasFocus = true"
            @blur="hasFocus = false"
            @keydown="onKeydown"
        />
        <slot name="append"></slot>
        <slot v-if="showClearIcon" name="clear-icon" :clear="clear">
            <button class="search-icon clear" aria-label="Clear" @mousedown="clear" @keydown.space.enter="clear"></button>
        </slot>
        <slot name="append-outer"></slot>
    </div>
</template>

<script lang="ts">
/*
 * This component is copied wholesale from https://github.com/kouts/vue-search-input
 * It doesn't work out of the box and the types were messed up, since it was just one file it was
 * easiest to just copy and clean up. MIT license, so safe to do.
 */
import { computed, defineComponent, PropType, ref } from "vue";
export const fieldType = ["search", "text"];
export type FieldType = (typeof fieldType)[number];
function filterObject(obj: { [key: string]: unknown }, properties: (string | number)[], remove = true) {
    const res: { [key: string]: unknown } = {};
    Object.keys(obj).forEach((objAttr) => {
        const condition = remove ? properties.indexOf(objAttr) === -1 : properties.indexOf(objAttr) >= 0;
        if (condition) {
            res[objAttr] = obj[objAttr];
        }
    });
    return res;
}
function defaultBoolean(val = true) {
    return { type: Boolean, default: val };
}
export default defineComponent({
    inheritAttrs: false,
    props: {
        type: {
            type: String as PropType<FieldType>,
            default: "search",
            validator: (prop: FieldType) => fieldType.includes(prop),
        },
        modelValue: {
            type: String,
            default: "",
        },
        wrapperClass: {
            type: String,
            default: "search-input-wrapper",
        },
        searchIcon: defaultBoolean(),
        clearIcon: defaultBoolean(),
        clearOnEsc: defaultBoolean(),
        blurOnEsc: defaultBoolean(),
        selectOnFocus: defaultBoolean(),
    },
    emits: ["update:modelValue"],
    setup(props, { emit, attrs }) {
        const hasFocus = ref(false);
        const inputRef = ref<null | HTMLInputElement>(null);
        const attrsWithoutStyles = computed(() => filterObject(attrs, ["class", "style"]));
        const attrsStyles = computed(() => {
            const res = filterObject(attrs, ["class", "style"], false);
            if (!res.class) res.class = props.wrapperClass;
            return res;
        });
        const showClearIcon = computed(() => !!(props.clearIcon && props.modelValue.length > 0));
        function clear() {
            emit("update:modelValue", "");
        }
        function onInput(e: Event) {
            emit("update:modelValue", (e.target as HTMLInputElement).value);
        }
        function onKeydown(e: KeyboardEvent) {
            if (e.key === "Escape") {
                props.clearOnEsc && clear();
                if (props.blurOnEsc) {
                    const el = inputRef.value as HTMLInputElement;
                    el.blur();
                }
            }
        }
        return {
            inputRef,
            hasFocus,
            clear,
            onInput,
            onKeydown,
            attrsStyles,
            attrsWithoutStyles,
            showClearIcon,
        };
    },
});
</script>

<style lang="scss" scoped>
$input-color: #ccc;
$input-background: #ffffff11;
$icon-color: $input-color;
$active-color: #ccc;
.search-input-wrapper {
    position: relative;
    flex-shrink: 0;

    input[data-search-input="true"] {
        display: block;
        width: 100%;
        padding: 6px 20px 6px 35px;
        font-size: 20px;
        color: $input-color;
        max-width: 125px;
        background-color: $input-background;
        border: 1px solid rgba(255, 255, 255, 0.2);
        transition-property: border-color, padding, max-width;
        transition-duration: 0.25s;
        transition-timing-function: ease-in-out;
        &:focus {
            background-color: lighten($input-background, 25%);
            border-color: $active-color;
            outline: 0;
            box-shadow: none;
            max-width: 50vw;
        }
    }

    .search-icon {
        position: absolute;
        &.search {
            color: $icon-color;
            left: 12px;
            bottom: 12px;
            box-sizing: border-box;
            display: block;
            width: 16px;
            height: 16px;
            border: 2px solid;
            border-radius: 100%;
            margin-left: -4px;
            margin-top: -4px;
        }
        &.search::after {
            color: darken($icon-color, 30%);
            content: "";
            display: block;
            box-sizing: border-box;
            position: absolute;
            border-radius: 3px;
            width: 2px;
            height: 7px;
            background: $icon-color;
            transform: rotate(-45deg);
            top: 11px;
            left: 12px;
        }
        &.clear {
            right: 5px;
            bottom: 7px;
            cursor: pointer;
            z-index: 10;
            box-sizing: border-box;
            display: block;
            width: 24px;
            height: 24px;
            border: 2px solid transparent;
            border-radius: 40px;
            background: none;
            padding: 0px;
            outline: none;
            &:focus {
                background: darken($input-background, 4%);
            }
        }
        &.clear::after,
        &.clear::before {
            content: "";
            display: block;
            box-sizing: border-box;
            position: absolute;
            width: 16px;
            height: 2px;
            background: $icon-color;
            transform: rotate(45deg);
            border-radius: 5px;
            top: 9px;
            left: 2px;
        }
        &.clear::after {
            transform: rotate(-45deg);
        }
    }
}

/* Fix the X appearing in search field on Chrome and IE */
input[type="search"]::-ms-clear {
    display: none;
    width: 0;
    height: 0;
}
input[type="search"]::-ms-reveal {
    display: none;
    width: 0;
    height: 0;
}

input[type="search"]::-webkit-search-decoration,
input[type="search"]::-webkit-search-cancel-button,
input[type="search"]::-webkit-search-results-button,
input[type="search"]::-webkit-search-results-decoration {
    display: none;
}
</style>
