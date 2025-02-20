import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Arabic(props: LaunchProps) {
  await translate("AR", props);
}
