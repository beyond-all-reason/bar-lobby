<template>
    <Panel>
        <Form @submit="onSubmit">
            <Textbox name="email" type="email" label="Email" />
            <button>Sign up for newsletter</button>
        </Form>
    </Panel>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    setup() {
        const onSubmit = (values: any) => {
            console.log(values);
        };

        return { onSubmit };
    }
});
</script>

