import next from "eslint-config-next";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "android/**",
      "functions/**",
      "out/**",
      "public/sw.js",
    ],
  },
  ...next,
];

export default eslintConfig;


