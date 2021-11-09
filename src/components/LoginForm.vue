<template>
    <div class="login-form">
        <button class="btn">Register</button>
        <div class="input">
            <label>Email</label>
            <input type="text">
        </div>
        <div class="input">
            <label>Password</label>
            <input type="password">
        </div>

        <div class="test">
            This is a long test
        </div>

        <div class="test">
            test
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    setup() {
        return {};
    }
});
</script>

<style scoped lang="scss">
.login-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: 400px;
}
label {
    font-size: 20px;
    font-weight: 200;
}
.input {
    display: flex;
    flex-direction: column;
}
input[type=text], input[type=password] {
    width: 100%;
    font-size: 24px;
    padding: 10px 10px;
}

.test {
    align-self: flex-start;
    position: relative;
    max-width: 400px;
    padding: 5px 10px;
    margin: 7px;

    --notchSize: 7px;
    --a: rgba(0, 0, 0, 0.3);
    --b: rgba(0, 0, 0, 0.3);

    filter:
        drop-shadow(0 2px 0px var(--a))
        drop-shadow(0 -2px 0px var(--a))
        drop-shadow(2px 0 0px var(--a))
        drop-shadow(-2px 0 0px var(--a))
        drop-shadow(0 10px 0px var(--b))
        drop-shadow(0 -10px 0px var(--b))
        drop-shadow(10px 0 0px var(--b))
        drop-shadow(-10px 0 0px var(--b));

    clip-path: polygon(
        -10px 0, 
        0 -10px,
        10px -10px,
        15px -8px,
        calc(100% - 15px) -8px,
        calc(100% - 10px) -10px,
        calc(100%) -10px,
        calc(100% + 10px) 0, 
        calc(100% + 10px) 100%, 
        100% calc(100% + 10px), 
        calc(100% - 10px) calc(100% + 10px), 
        calc(100% - 15px) calc(100% + 8px), 
        15px calc(100% + 8px), 
        10px calc(100% + 10px), 
        0 calc(100% + 10px), 
        -10px 100%
    );

    &:before {
        position: absolute;
        z-index: -1;
        top: 0; right: 0; bottom: 0; left: 0;
        content: '';
        background: #f06d06;
        clip-path: polygon(
            0% var(--notchSize), 
            var(--notchSize) 0%, 
            calc(100% - var(--notchSize)) 0%, 
            100% var(--notchSize), 
            100% calc(100% - var(--notchSize)), 
            calc(100% - var(--notchSize)) 100%, 
            var(--notchSize) 100%, 
            0% calc(100% - var(--notchSize))
        );
    }
}
</style>