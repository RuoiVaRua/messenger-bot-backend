import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      }
    }
  },
  pluginJs.configs.recommended,
  {
    rules: {
      // Thêm các quy tắc tùy chỉnh của bạn tại đây
      'no-unused-vars': ['error', { 'argsIgnorePattern': '^e$' }] // Để bỏ qua lỗi 'e' is defined but never used
    }
  }
];