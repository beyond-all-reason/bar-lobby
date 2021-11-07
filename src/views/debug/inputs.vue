<template>
    <Panel>
        <div class="controls">
            <div class="control">
                <label for="type-text">Text (text)</label>
                <input type="text" name="type-text" id="type-text" placeholder="placeholder">
            </div>
            <div class="control">
                <label for="type-search">Search (search)</label>
                <input type="search" name="type-search" id="type-search" value="This is some text">
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
                <input type="button" value="Button" name="button">
            </div>
            <div class="control">
                <button>I am a button</button>
            </div>
            <div class="control">
                <label for="submit-1">Submit</label>
                <input type="submit" value="Submit" name="submit-1">
            </div>
            <div class="control">
                <label for="select">Select</label>
                <select name="select">
                    <optgroup label="Theropods">
                        <option>Tyrannosaurus</option>
                        <option>Velociraptor</option>
                        <option>Deinonychus</option>
                    </optgroup>
                    <optgroup label="Sauropods">
                        <option>Diplodocus</option>
                        <option>Saltasaurus</option>
                        <option>Apatosaurus</option>
                    </optgroup>
                </select>
            </div>
            <div class="control">
                <label for="check2">Checkbox</label>
                <input type="checkbox">
                <label for="check" name="check2"></label>
            </div>
            <div class="control">
                <label for="textarea">Textarea</label>
                <textarea name="textarea" rows="4">I am a text area</textarea>
            </div>
            <div class="control">
                <label for="ice-cream-flavors">Datalist</label>
                <datalist id="ice-cream-flavors">
                    <option value="Chocolate"></option>
                    <option value="Coconut"></option>
                    <option value="Mint"></option>
                    <option value="Strawberry"></option>
                    <option value="Vanilla"></option>
                </datalist>
            </div>
            <div class="control">
                <label for="file">File progress:</label>
                <progress id="file" max="100" value="70"> 70% </progress>
            </div>
            <div class="control">
                <label for="fuel">Fuel level:</label>
                <meter id="fuel" min="0" max="100" low="33" high="66" optimum="80" value="50">
                    at 50/100
                </meter>
            </div>
            <div class="control">
                <label for="myFile">File upload</label>
                <input type="file" id="myFile" name="filename">
            </div>
        </div>
    </Panel>
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
    position: relative;
    display: grid;
    grid-template-columns: 300px 300px;
    gap: 10px;
}
</style>