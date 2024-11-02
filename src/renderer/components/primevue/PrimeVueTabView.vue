<!--
    Implements:
    - https://github.com/primefaces/primevue/pull/3086
    - https://github.com/primefaces/primevue/pull/3627
    - <slot name="header"/>
-->

<template>
    <div :class="contentClasses">
        <div class="p-tabview-nav-container">
            <button
                v-if="scrollable && !isPrevButtonDisabled"
                ref="prevBtn"
                v-ripple
                type="button"
                class="p-tabview-nav-prev p-tabview-nav-btn p-link"
                :tabindex="tabindex"
                :aria-label="prevButtonAriaLabel"
                v-bind="previousButtonProps"
                @click="onPrevButtonClick"
            >
                <span class="pi pi-chevron-left" aria-hidden="true"></span>
            </button>
            <div ref="content" class="p-tabview-nav-content" @scroll="onScroll">
                <ul ref="nav" class="p-tabview-nav" role="tablist">
                    <li
                        v-for="(tab, i) of tabs"
                        :key="getKey(tab, i)"
                        :style="getTabProp(tab, 'headerStyle')"
                        :class="getTabHeaderClass(tab, i)"
                        role="presentation"
                        :data-index="i"
                        v-bind="getTabProp(tab, 'headerProps')"
                    >
                        <a
                            :id="getTabHeaderActionId(i)"
                            v-ripple
                            class="p-tabview-nav-link p-tabview-header-action"
                            :tabindex="getTabProp(tab, 'disabled') || !isTabActive(i) ? -1 : tabindex"
                            role="tab"
                            :aria-disabled="getTabProp(tab, 'disabled')"
                            :aria-selected="isTabActive(i)"
                            :aria-controls="getTabContentId(i)"
                            v-bind="getTabProp(tab, 'headerActionProps')"
                            @click="onTabClick($event, tab, i)"
                            @keydown="onTabKeyDown($event, tab, i)"
                        >
                            <span v-if="tab.props && tab.props.header" class="p-tabview-title">{{ tab.props.header }}</span>
                            <component :is="tab.children.header" v-if="tab.children && tab.children.header"></component>
                        </a>
                    </li>
                    <li ref="inkbar" class="p-tabview-ink-bar" role="presentation" aria-hidden="true"></li>
                    <slot name="header"></slot>
                </ul>
            </div>
            <button
                v-if="scrollable && !isNextButtonDisabled"
                ref="nextBtn"
                v-ripple
                type="button"
                class="p-tabview-nav-next p-tabview-nav-btn p-link"
                :tabindex="tabindex"
                :aria-label="nextButtonAriaLabel"
                v-bind="nextButtonProps"
                @click="onNextButtonClick"
            >
                <span class="pi pi-chevron-right" aria-hidden="true"></span>
            </button>
        </div>
        <div class="p-tabview-panels">
            <template v-for="(tab, i) of tabs" :key="getKey(tab, i)">
                <div
                    v-if="lazy ? isTabActive(i) : true"
                    v-show="lazy ? true : isTabActive(i)"
                    :style="getTabProp(tab, 'contentStyle')"
                    :class="getTabContentClass(tab)"
                    role="tabpanel"
                    :aria-labelledby="getTabHeaderActionId(i)"
                    v-bind="getTabProp(tab, 'contentProps')"
                >
                    <component :is="tab"></component>
                </div>
            </template>
        </div>
    </div>
</template>

<script lang="js">
import Ripple from "primevue/ripple";
import { DomHandler, UniqueComponentId } from "primevue/utils";

export default {
    name: "TabView",
    directives: {
        ripple: Ripple,
    },
    props: {
        activeIndex: {
            type: Number,
            default: 0,
        },
        lazy: {
            type: Boolean,
            default: false,
        },
        scrollable: {
            type: Boolean,
            default: false,
        },
        tabindex: {
            type: Number,
            default: 0,
        },
        selectOnFocus: {
            type: Boolean,
            default: false,
        },
        previousButtonProps: {
            type: null,
            default: null,
        },
        nextButtonProps: {
            type: null,
            default: null,
        },
    },
    emits: ["update:activeIndex", "tab-change", "tab-click"],
    data() {
        return {
            updateKey: 0,
            id: this.$attrs.id,
            d_activeIndex: this.activeIndex,
            isPrevButtonDisabled: true,
            isNextButtonDisabled: false,
        };
    },
    computed: {
        contentClasses() {
            return [
                "p-tabview p-component",
                {
                    "p-tabview-scrollable": this.scrollable,
                },
            ];
        },
        tabs() {
            const nodes = this.$slots.default();
            return this.getTabNodes(nodes);
        },
        prevButtonAriaLabel() {
            return this.$primevue.config.locale.aria ? this.$primevue.config.locale.aria.previous : undefined;
        },
        nextButtonAriaLabel() {
            return this.$primevue.config.locale.aria ? this.$primevue.config.locale.aria.next : undefined;
        },
    },
    watch: {
        "$attrs.id": function (newValue) {
            this.id = newValue || UniqueComponentId();
        },
        activeIndex(newValue) {
            this.d_activeIndex = newValue;

            this.scrollInView({ index: newValue });
        },
    },
    mounted() {
        this.id = this.id || UniqueComponentId();

        this.updateInkBar();
        if (this.scrollable) this.updateButtonState();
    },
    beforeUpdate() {
        this.updateKey++;
    },
    updated() {
        this.updateInkBar();
    },
    methods: {
        isTabPanel(child) {
            return child.type.name === "TabPanel";
        },
        isTabActive(index) {
            return this.d_activeIndex === index;
        },
        getTabProp(tab, name) {
            return tab.props ? tab.props[name] : undefined;
        },
        getKey(tab, index) {
            return this.getTabProp(tab, "header") || index;
        },
        getTabHeaderActionId(index) {
            return `${this.id}_${index}_header_action`;
        },
        getTabContentId(index) {
            return `${this.id}_${index}_content`;
        },
        onScroll(event) {
            if (this.scrollable) this.updateButtonState();
            event.preventDefault();
        },
        onPrevButtonClick() {
            const content = this.$refs.content;
            const width = DomHandler.getWidth(content) - this.getVisibleButtonWidths();
            const pos = content.scrollLeft - width;
            content.scrollLeft = pos <= 0 ? 0 : pos;
        },
        onNextButtonClick() {
            const content = this.$refs.content;
            const width = DomHandler.getWidth(content) - this.getVisibleButtonWidths();
            const pos = content.scrollLeft + width;
            const lastPos = content.scrollWidth - width;
            content.scrollLeft = pos >= lastPos ? lastPos : pos;
        },
        onTabClick(event, tab, index) {
            this.changeActiveIndex(event, tab, index);
            this.$emit("tab-click", { originalEvent: event, index });
        },
        onTabKeyDown(event, tab, index) {
            switch (event.code) {
                case "ArrowLeft":
                    this.onTabArrowLeftKey(event);
                    break;

                case "ArrowRight":
                    this.onTabArrowRightKey(event);
                    break;

                case "Home":
                    this.onTabHomeKey(event);
                    break;

                case "End":
                    this.onTabEndKey(event);
                    break;

                case "PageDown":
                    this.onPageDownKey(event);
                    break;

                case "PageUp":
                    this.onPageUpKey(event);
                    break;

                case "Enter":
                case "Space":
                    this.onTabEnterKey(event, tab, index);
                    break;

                default:
                    break;
            }
        },
        onTabArrowRightKey(event) {
            const nextHeaderAction = this.findNextHeaderAction(event.target.parentElement);
            if (nextHeaderAction) {
                this.changeFocusedTab(event, nextHeaderAction);
            } else {
                this.onTabHomeKey(event);
            }
            event.preventDefault();
        },
        onTabArrowLeftKey(event) {
            const prevHeaderAction = this.findPrevHeaderAction(event.target.parentElement);
            if (prevHeaderAction) {
                this.changeFocusedTab(event, prevHeaderAction);
            } else {
                this.onTabEndKey(event);
            }
            event.preventDefault();
        },
        onTabHomeKey(event) {
            const firstHeaderAction = this.findFirstHeaderAction();

            this.changeFocusedTab(event, firstHeaderAction);
            event.preventDefault();
        },
        onTabEndKey(event) {
            const lastHeaderAction = this.findLastHeaderAction();

            this.changeFocusedTab(event, lastHeaderAction);
            event.preventDefault();
        },
        onPageDownKey(event) {
            this.scrollInView({ index: this.$refs.nav.children.length - 2 });
            event.preventDefault();
        },
        onPageUpKey(event) {
            this.scrollInView({ index: 0 });
            event.preventDefault();
        },
        onTabEnterKey(event, tab, index) {
            this.changeActiveIndex(event, tab, index);

            event.preventDefault();
        },
        findNextHeaderAction(tabElement, selfCheck = false) {
            const headerElement = selfCheck ? tabElement : tabElement.nextElementSibling;

            return headerElement
                ? DomHandler.hasClass(headerElement, "p-disabled") || DomHandler.hasClass(headerElement, "p-tabview-ink-bar")
                    ? this.findNextHeaderAction(headerElement)
                    : DomHandler.findSingle(headerElement, ".p-tabview-header-action")
                : null;
        },
        findPrevHeaderAction(tabElement, selfCheck = false) {
            const headerElement = selfCheck ? tabElement : tabElement.previousElementSibling;

            return headerElement
                ? DomHandler.hasClass(headerElement, "p-disabled") || DomHandler.hasClass(headerElement, "p-tabview-ink-bar")
                    ? this.findPrevHeaderAction(headerElement)
                    : DomHandler.findSingle(headerElement, ".p-tabview-header-action")
                : null;
        },
        findFirstHeaderAction() {
            return this.findNextHeaderAction(this.$refs.nav.firstElementChild, true);
        },
        findLastHeaderAction() {
            return this.findPrevHeaderAction(this.$refs.nav.lastElementChild, true);
        },
        changeActiveIndex(event, tab, index) {
            if (!this.getTabProp(tab, "disabled") && this.d_activeIndex !== index) {
                this.d_activeIndex = index;

                this.$emit("update:activeIndex", index);
                this.$emit("tab-change", { originalEvent: event, index });

                this.scrollInView({ index });
            }
        },
        changeFocusedTab(event, element) {
            if (element) {
                DomHandler.focus(element);
                this.scrollInView({ element });

                if (this.selectOnFocus) {
                    const index = parseInt(element.parentElement.dataset.index, 10);
                    const tab = this.tabs[index];

                    this.changeActiveIndex(event, tab, index);
                }
            }
        },
        scrollInView({ element, index = -1 }) {
            const currentElement = element || this.$refs.nav.children[index];
            if (currentElement && currentElement.scrollIntoView) {
                currentElement.scrollIntoView({ block: "nearest" });
            }
        },
        updateInkBar() {
            let tabHeader = this.$refs.nav.children[this.d_activeIndex];

            this.$refs.inkbar.style.width = DomHandler.getWidth(tabHeader) + "px";
            this.$refs.inkbar.style.left = DomHandler.getOffset(tabHeader).left - DomHandler.getOffset(this.$refs.nav).left + "px";
        },
        updateButtonState() {
            const content = this.$refs.content;
            const { scrollLeft, scrollWidth } = content;
            const width = DomHandler.getWidth(content);

            this.isPrevButtonDisabled = scrollLeft === 0;
            this.isNextButtonDisabled = parseInt(scrollLeft) === scrollWidth - width;
        },
        getVisibleButtonWidths() {
            const { prevBtn, nextBtn } = this.$refs;

            return [prevBtn, nextBtn].reduce((acc, el) => (el ? acc + DomHandler.getWidth(el) : acc), 0);
        },
        getTabHeaderClass(tab, i) {
            return [
                "p-tabview-header",
                this.getTabProp(tab, "headerClass"),
                {
                    "p-highlight": this.d_activeIndex === i,
                    "p-disabled": this.getTabProp(tab, "disabled"),
                },
            ];
        },
        getTabContentClass(tab) {
            return ["p-tabview-panel", this.getTabProp(tab, "contentClass")];
        },
        getTabNodes(nodes) {
            const tabNodes = [];

            if (Array.isArray(nodes)) {
                for (const node of nodes) {
                    if (this.isTabPanel(node)) {
                        tabNodes.push(node);
                    } else if (node.children?.length) {
                        tabNodes.push(...this.getTabNodes(node.children));
                    }
                }
            } else if (this.isTabPanel(nodes)) {
                tabNodes.push(nodes);
            }

            return tabNodes;
        },
    },
};
</script>

<style>
.p-tabview-nav-container {
    position: relative;
}

.p-tabview-scrollable .p-tabview-nav-container {
    overflow: hidden;
}

.p-tabview-nav-content {
    overflow-x: auto;
    overflow-y: hidden;
    scroll-behavior: smooth;
    scrollbar-width: none;
    overscroll-behavior: contain auto;
}

.p-tabview-nav {
    display: flex;
    margin: 0;
    padding: 0;
    list-style-type: none;
    flex: 1 1 auto;
}

.p-tabview-header-action {
    cursor: pointer;
    user-select: none;
    display: flex;
    align-items: center;
    position: relative;
    text-decoration: none;
    overflow: hidden;
}

.p-tabview-header-right {
    width: unset !important;
}

.p-tabview-ink-bar {
    display: none;
    z-index: 1;
}

.p-tabview-header-action:focus {
    z-index: 1;
}

.p-tabview-title {
    line-height: 1;
    white-space: nowrap;
}

.p-tabview-nav-btn {
    position: absolute;
    top: 0;
    z-index: 2;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.p-tabview-nav-prev {
    left: 0;
}

.p-tabview-nav-next {
    right: 0;
}

.p-tabview-nav-content::-webkit-scrollbar {
    display: none;
}
</style>
