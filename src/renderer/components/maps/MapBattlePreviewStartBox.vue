<template>
    <div ref="boxElement" class="box-container box highlight" :style="boxStyles" :class="{ dragging: isDragging, resizing: isResizing }">
        <div class="box-tooltip" @mousedown="startDrag">
            <div class="box-tooltip-side n-side" @mousedown.stop="startResize('n-side', null, $event)"></div>
            <div class="box-tooltip-side e-side" @mousedown.stop="startResize('e-side', null, $event)"></div>
            <div class="box-tooltip-side s-side" @mousedown.stop="startResize('s-side', null, $event)"></div>
            <div class="box-tooltip-side w-side" @mousedown.stop="startResize('w-side', null, $event)"></div>
            <div class="box-tooltip-corner ne-corner" @mousedown.stop="startResize(null, 'ne-corner', $event)"></div>
            <div class="box-tooltip-corner se-corner" @mousedown.stop="startResize(null, 'se-corner', $event)"></div>
            <div class="box-tooltip-corner nw-corner" @mousedown.stop="startResize(null, 'nw-corner', $event)"></div>
            <div class="box-tooltip-corner sw-corner" @mousedown.stop="startResize(null, 'sw-corner', $event)"></div>
            <span>{{ id + 1 }}</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { StartBox } from "tachyon-protocol/types";
import { battleStore } from "@renderer/store/battle.store";

const props = defineProps({
    id: {
        type: Number,
        required: true,
    },
    box: {
        type: Object as () => StartBox,
        required: true,
    },
});

defineEmits(["update:box"]);

// Reference to the box element
const boxElement = ref<HTMLElement | null>(null);

// Track drag state
const isDragging = ref(false);
const isResizing = ref(false);
const activeHandle = ref<string | null>(null);
const startPos = ref({ x: 0, y: 0 });
const startBox = ref<StartBox | null>(null);
const parentRect = ref<DOMRect | null>(null);

// Computed styles to directly manipulate the DOM during drag/resize
const boxStyles = computed(() => {
    return {
        top: `${props.box.top * 100}%`,
        left: `${props.box.left * 100}%`,
        width: `${(props.box.right - props.box.left) * 100}%`,
        height: `${(props.box.bottom - props.box.top) * 100}%`,
    };
});

// Main box drag handler
function startDrag(event: MouseEvent) {
    // Ignore if clicked on resize handles
    if (
        (event.target as HTMLElement).classList.contains("box-tooltip-side") ||
        (event.target as HTMLElement).classList.contains("box-tooltip-corner")
    ) {
        return;
    }

    event.preventDefault();
    isDragging.value = true;

    // Store initial positions
    startPos.value = { x: event.clientX, y: event.clientY };
    startBox.value = { ...props.box };

    // Get the parent container dimensions for coordinate calculations
    const mapElement = boxElement.value?.closest(".map");
    if (mapElement) {
        parentRect.value = mapElement.getBoundingClientRect();
    }

    // Add event listeners for move and up
    document.addEventListener("mousemove", handleDrag);
    document.addEventListener("mouseup", endDrag);

    // Add visual feedback
    if (boxElement.value) {
        boxElement.value.classList.add("dragging");
    }
}

function handleDrag(event: MouseEvent) {
    if (!isDragging.value || !startBox.value || !parentRect.value || !boxElement.value) return;

    // Calculate the drag delta in normalized coordinates (0-1)
    const dx = (event.clientX - startPos.value.x) / parentRect.value.width;
    const dy = (event.clientY - startPos.value.y) / parentRect.value.height;

    // Calculate box dimensions
    const width = startBox.value.right - startBox.value.left;
    const height = startBox.value.bottom - startBox.value.top;

    // Calculate new positions, ensuring the box stays within bounds (0-1)
    let newLeft = Math.max(0, Math.min(1 - width, startBox.value.left + dx));
    let newTop = Math.max(0, Math.min(1 - height, startBox.value.top + dy));

    // Apply changes directly to the DOM for smooth dragging
    boxElement.value.style.left = `${newLeft * 100}%`;
    boxElement.value.style.top = `${newTop * 100}%`;
}

function endDrag() {
    if (!isDragging.value || !startBox.value || !parentRect.value || !boxElement.value) {
        resetDrag();
        return;
    }

    // Get the final position from the element's style
    const left = parseFloat(boxElement.value.style.left) / 100;
    const top = parseFloat(boxElement.value.style.top) / 100;

    // Create a new box with updated position but same size
    const newBox = {
        left,
        top,
        right: left + (startBox.value.right - startBox.value.left),
        bottom: top + (startBox.value.bottom - startBox.value.top),
    };

    // Clear inline styles
    boxElement.value.style.left = "";
    boxElement.value.style.top = "";
    boxElement.value.classList.remove("dragging");

    // Emit the update
    updateBoxInStore(newBox);

    resetDrag();
}

function resetDrag() {
    isDragging.value = false;
    startBox.value = null;
    document.removeEventListener("mousemove", handleDrag);
    document.removeEventListener("mouseup", endDrag);
}

// Resize handlers
function startResize(side: string | null, corner: string | null, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    isResizing.value = true;

    if (side) activeHandle.value = side;
    if (corner) activeHandle.value = corner;

    // Store initial positions
    startPos.value = { x: event.clientX, y: event.clientY };
    startBox.value = { ...props.box };

    // Get the parent container dimensions
    const mapElement = boxElement.value?.closest(".map");
    if (mapElement) {
        parentRect.value = mapElement.getBoundingClientRect();
    }

    // Add event listeners for move and up
    document.addEventListener("mousemove", handleResize);
    document.addEventListener("mouseup", endResize);

    // Add visual feedback
    if (boxElement.value) {
        boxElement.value.classList.add("resizing");
    }

    // Set cursor for the entire document during resize
    if (side === "n-side" || side === "s-side") {
        document.body.style.cursor = "ns-resize";
    } else if (side === "e-side" || side === "w-side") {
        document.body.style.cursor = "ew-resize";
    } else if (corner === "ne-corner" || corner === "sw-corner") {
        document.body.style.cursor = "nesw-resize";
    } else if (corner === "nw-corner" || corner === "se-corner") {
        document.body.style.cursor = "nwse-resize";
    }
}

function handleResize(event: MouseEvent) {
    if (!isResizing.value || !startBox.value || !parentRect.value || !activeHandle.value || !boxElement.value) return;

    // Calculate the movement in normalized coordinates (0-1)
    const dx = (event.clientX - startPos.value.x) / parentRect.value.width;
    const dy = (event.clientY - startPos.value.y) / parentRect.value.height;

    // Start with the initial size
    const newBox = { ...startBox.value };

    // Update the appropriate sides based on which handle is dragged
    switch (activeHandle.value) {
        // Sides
        case "n-side":
            newBox.top = Math.min(newBox.bottom - 0.05, startBox.value.top + dy);
            break;
        case "e-side":
            newBox.right = Math.max(newBox.left + 0.05, startBox.value.right + dx);
            break;
        case "s-side":
            newBox.bottom = Math.max(newBox.top + 0.05, startBox.value.bottom + dy);
            break;
        case "w-side":
            newBox.left = Math.min(newBox.right - 0.05, startBox.value.left + dx);
            break;

        // Corners
        case "ne-corner":
            newBox.top = Math.min(newBox.bottom - 0.05, startBox.value.top + dy);
            newBox.right = Math.max(newBox.left + 0.05, startBox.value.right + dx);
            break;
        case "se-corner":
            newBox.bottom = Math.max(newBox.top + 0.05, startBox.value.bottom + dy);
            newBox.right = Math.max(newBox.left + 0.05, startBox.value.right + dx);
            break;
        case "sw-corner":
            newBox.bottom = Math.max(newBox.top + 0.05, startBox.value.bottom + dy);
            newBox.left = Math.min(newBox.right - 0.05, startBox.value.left + dx);
            break;
        case "nw-corner":
            newBox.top = Math.min(newBox.bottom - 0.05, startBox.value.top + dy);
            newBox.left = Math.min(newBox.right - 0.05, startBox.value.left + dx);
            break;
    }

    // Clamp values to ensure they stay within bounds
    newBox.top = Math.max(0, Math.min(1, newBox.top));
    newBox.right = Math.max(0, Math.min(1, newBox.right));
    newBox.bottom = Math.max(0, Math.min(1, newBox.bottom));
    newBox.left = Math.max(0, Math.min(1, newBox.left));

    // Apply changes directly to DOM
    boxElement.value.style.top = `${newBox.top * 100}%`;
    boxElement.value.style.left = `${newBox.left * 100}%`;
    boxElement.value.style.width = `${(newBox.right - newBox.left) * 100}%`;
    boxElement.value.style.height = `${(newBox.bottom - newBox.top) * 100}%`;
}

function endResize() {
    if (!isResizing.value || !boxElement.value) {
        resetResize();
        return;
    }

    // Get the final dimensions from the element's style
    const top = parseFloat(boxElement.value.style.top) / 100;
    const left = parseFloat(boxElement.value.style.left) / 100;
    const width = parseFloat(boxElement.value.style.width) / 100;
    const height = parseFloat(boxElement.value.style.height) / 100;

    // Create the new box
    const newBox = {
        top,
        left,
        right: left + width,
        bottom: top + height,
    };

    // Clear inline styles
    boxElement.value.style.top = "";
    boxElement.value.style.left = "";
    boxElement.value.style.width = "";
    boxElement.value.style.height = "";
    boxElement.value.classList.remove("resizing");

    // Update the store
    updateBoxInStore(newBox);

    resetResize();
}

function resetResize() {
    isResizing.value = false;
    activeHandle.value = null;
    startBox.value = null;
    document.body.style.cursor = "";
    document.removeEventListener("mousemove", handleResize);
    document.removeEventListener("mouseup", endResize);
}

// Update the store with the new box values
function updateBoxInStore(newBox: StartBox) {
    // Clone the current boxes array from the store to ensure reactivity
    const customBoxes = [...(battleStore.battleOptions.mapOptions.customStartBoxes || [])];

    // Make sure we're working with valid data
    if (!customBoxes || props.id < 0 || props.id >= customBoxes.length) {
        if (battleStore.battleOptions.mapOptions.startBoxesIndex != undefined) {
            console.warn('Invalid update on predefined boxes')
        } else {
            console.error("Invalid box data or index:", props.id, customBoxes);
        }
        return;
    }

    // Update the current box
    customBoxes[props.id] = { ...newBox };

    // Save back to the store with a new array reference to trigger reactivity
    battleStore.battleOptions.mapOptions.customStartBoxes = customBoxes;

    // Log for debugging
    console.log("Box updated in store:", props.id, newBox, customBoxes, battleStore.battleOptions.mapOptions.customStartBoxes);
}
</script>

<style lang="scss" scoped>
.box {
    position: absolute;
    box-sizing: border-box;
    transition: all 0.1s ease;
    will-change: transform, width, height, top, left;

    &.dragging,
    &.resizing {
        transition: none; /* Disable transitions during drag/resize for smoother updates */
        z-index: 10; /* Ensure the box being manipulated appears on top */
    }

    &.dragging {
        box-shadow:
            0 0 8px rgba(200, 200, 200, 0.6),
            0 0 15px rgba(200, 200, 200, 0.5);
        background-color: rgba(200, 200, 200, 0.3);
    }
}

.box-tooltip {
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    color: white;
    font-size: 1.5rem;
    position: relative;

    cursor:
        url("/src/renderer/assets/images/uimove_0.png") 16 16,
        move !important;
}

.box-tooltip-side,
.box-tooltip-corner {
    position: absolute;
}

.box-tooltip-side:hover,
.box-tooltip-corner:hover {
    box-shadow:
        0 0 8px rgba(200, 200, 200, 0.4),
        0 0 15px rgba(200, 200, 200, 0.3);
    background-color: rgba(200, 200, 200, 0.3);
}

.box-tooltip-side:active,
.box-tooltip-corner:active {
    box-shadow:
        0 0 8px rgba(200, 200, 200, 0.6),
        0 0 15px rgba(200, 200, 200, 0.5);
    background-color: rgba(200, 200, 200, 0.6);
}

$centerOffset: -5px;
$sideWidth: 10px;
$sideLength: calc(100% - $sideWidth);

.box-tooltip-side.n-side {
    width: $sideLength;
    height: $sideWidth;
    top: $centerOffset;
    cursor:
        url("/src/renderer/assets/images/uiresizev_0.png") 16 16,
        ns-resize !important;
}

.box-tooltip-side.e-side {
    width: $sideWidth;
    height: $sideLength;
    right: $centerOffset;
    cursor:
        url("/src/renderer/assets/images/uiresizeh_0.png") 16 16,
        ew-resize !important;
}

.box-tooltip-side.s-side {
    width: $sideLength;
    height: $sideWidth;
    bottom: $centerOffset;
    cursor:
        url("/src/renderer/assets/images/uiresizev_0.png") 16 16,
        ns-resize !important;
}

.box-tooltip-side.w-side {
    width: $sideWidth;
    height: $sideLength;
    left: $centerOffset;
    cursor:
        url("/src/renderer/assets/images/uiresizeh_0.png") 16 16,
        ew-resize !important;
}

.box-tooltip-corner.ne-corner {
    width: $sideWidth;
    height: $sideWidth;
    top: $centerOffset;
    right: $centerOffset;
    cursor:
        url("/src/renderer/assets/images/uiresized2_0.png") 16 16,
        nesw-resize !important;
}

.box-tooltip-corner.se-corner {
    width: $sideWidth;
    height: $sideWidth;
    bottom: $centerOffset;
    right: $centerOffset;
    cursor:
        url("/src/renderer/assets/images/uiresized1_0.png") 16 16,
        nwse-resize !important;
}

.box-tooltip-corner.nw-corner {
    width: $sideWidth;
    height: $sideWidth;
    top: $centerOffset;
    left: $centerOffset;
    cursor:
        url("/src/renderer/assets/images/uiresized1_0.png") 16 16,
        nwse-resize !important;
}

.box-tooltip-corner.sw-corner {
    width: $sideWidth;
    height: $sideWidth;
    bottom: $centerOffset;
    left: $centerOffset;
    cursor:
        url("/src/renderer/assets/images/uiresized2_0.png") 16 16,
        nesw-resize !important;
}

@keyframes subtleGlow {
    0%,
    100% {
        box-shadow:
            0 0 8px rgba(200, 200, 200, 0.4),
            0 0 15px rgba(200, 200, 200, 0.3);
        background-color: rgba(200, 200, 200, 0.1);
    }
    50% {
        box-shadow:
            0 0 15px rgba(200, 200, 200, 0.5),
            0 0 25px rgba(200, 200, 200, 0.4);
        background-color: rgba(200, 200, 200, 0.15);
    }
}

.highlight {
    border: 2px dashed rgba(255, 255, 255, 1);
    box-shadow:
        0 0 15px rgba(200, 200, 200, 0.5),
        0 0 25px rgba(200, 200, 200, 0.4);
    background-color: rgba(200, 200, 200, 0.15);
    // animation: subtleGlow 1.5s infinite ease-in-out; // super resource intensive unfortunately
    transition: all 0.2s ease;
    will-change: width, height, top, left;
}
</style>
