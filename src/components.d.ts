import Icon from "@/components/common/Icon.vue";
import Loader from "@/components/common/Loader.vue";
import Modal from "@/components/common/Modal.vue";
import Panel from "@/components/common/Panel.vue";
import Progress from "@/components/common/Progress.vue";
import Tab from "@/components/common/Tab.vue";
import Button from "@/components/inputs/Button.vue";
import Checkbox from "@/components/inputs/Checkbox.vue";
import Range from "@/components/inputs/Range.vue";
import Select from "@/components/inputs/Select.vue";
import Textbox from "@/components/inputs/Textbox.vue";
import Alert from "@/components/Alert.vue";
import Battle from "@/components/Battle.vue";
import Breadcrumbs from "@/components/Breadcrumbs.vue";
import DebugSidebar from "@/components/DebugSidebar.vue";
import Exit from "@/components/Exit.vue";
import LoginForm from "@/components/LoginForm.vue";
import NavBar from "@/components/NavBar.vue";
import RegisterForm from "@/components/RegisterForm.vue";
import ResetPasswordForm from "@/components/ResetPasswordForm.vue";
import Settings from "@/components/Settings.vue";

declare module "@vue/runtime-core" {
    export interface GlobalComponents {
        RouterLink: typeof RouterLink;
        RouterView: typeof RouterView;
        Markdown: typeof Markdown;

        Icon: typeof Icon;
        Loader: typeof Loader;
        Modal: typeof Modal;
        Panel: typeof Panel;
        Progress: typeof Progress;
        Tab: typeof Tab;
        Button: typeof Button;
        Checkbox: typeof Checkbox;
        Range: typeof Range;
        Select: typeof Select;
        Textbox: typeof Textbox;
        Alert: typeof Alert;
        Battle: typeof Battle;
        Breadcrumbs: typeof Breadcrumbs;
        DebugSidebar: typeof DebugSidebar;
        Exit: typeof Exit;
        LoginForm: typeof LoginForm;
        NavBar: typeof NavBar;
        RegisterForm: typeof RegisterForm;
        ResetPasswordForm: typeof ResetPasswordForm;
        Settings: typeof Settings;
    }
}