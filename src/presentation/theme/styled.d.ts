import "styled-components";
import type { defaultTheme } from "./themes/default.theme";

type AppTheme = typeof defaultTheme;

declare module "styled-components" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- module augmentation requires this shape
  export interface DefaultTheme extends AppTheme {}
}
