import { marked, Renderer } from "marked";

const markdownRenderer = new Renderer();

// Prevents marked from parsing #.
marked.use({
    tokenizer: {
        heading() {
            return false;
        },
    },
});

export default markdownRenderer;
