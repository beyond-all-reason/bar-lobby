<template>
    <div class="controls">
        <div class="control">
            <label for="type-text">Text (text)</label>
            <input type="text" name="type-text" id="type-text">
        </div>
        <div class="control">
            <label for="type-search">Search (search)</label>
            <input type="search" name="type-search" id="type-search">
        </div>
        <div class="control">
            <label for="type-tel">Telephone (tel)</label>
            <input type="tel" name="type-tel" id="type-tel">
        </div>
        <div class="control">
            <label for="type-url">URL (url)</label>
            <input type="url" name="type-url" id="type-url">
        </div>
        <div class="control">
            <label for="type-email">E-mail (email)</label>
            <input type="email" name="type-email" id="type-email">
        </div>
        <div class="control">
            <label for="type-datetime">Date and Time (datetime)</label>
            <input type="datetime" name="type-datetime" id="type-datetime">
        </div>
        <div class="control">
            <label for="type-date">Date (date)</label>
            <input type="date" name="type-date" id="type-date">
        </div>
        <div class="control">
            <label for="type-month">Month (month)</label>
            <input type="month" name="type-month" id="type-month">
        </div>
        <div class="control">
            <label for="type-week">Week (week)</label>
            <input type="week" name="type-week" id="type-week">
        </div>
        <div class="control">
            <label for="type-time">Time (time)</label>
            <input type="time" name="type-time" id="type-time">
        </div>
        <div class="control">
            <label for="type-datetime-local">Local Date and Time (datetime-local)</label>
            <input type="datetime-local" name="type-datetime-local" id="type-datetime-local">
        </div>
        <div class="control">
            <label for="type-number">Number (number)</label>
            <input type="number" name="type-number" id="type-number" min="0" max="20">
        </div>
        <div class="control">
            <label for="type-range">Range (range)</label>
            <input type="range" name="type-range" id="type-range" min="0" max="100">
        </div>
        <div class="control">
            <label for="type-color">Colour (color)</label>
            <input type="color" name="type-color" id="type-color">
        </div>
        <div class="control">
            <label for="submit-1">Submit</label>
            <input type="submit" value="Submit" name="submit-1">
        </div>
        <div class="control">
            <label for="button">Button</label>
            <input type="button" value="Button" name="button">
        </div>
        <div class="control">
            <label for="select">Select</label>
            <select name="select">
                <option>Option 1</option>
                <option>Option 2</option>
                <option>Option 3</option>
            </select>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    layout: "default",
    setup() {
        return {};
    }
});
</script>

<style scoped lang="scss">
.controls {
    display: flex;
    flex-direction: column;
    gap: 7px;
    max-width: 300px;
    color: #fff;
}
.control {
    position: relative;
}
label {
    position: absolute;
    top: 0;
    left: 0;
    font-size: 12px;
    padding-left: 5px;
    background: red;
    &:after {
        @extend .pseudo-fill;
    }
}
input, select {
    margin-top: 7px;
    padding: 7px 5px 3px 5px;
    border: 2px solid rgba(255, 255, 255, 0.5);
    border-top: none;
    width: 100%;
}
</style>