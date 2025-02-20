import { LaunchProps } from "@raycast/api";
import { translate } from "./utils";

export default async function Spanish(props: LaunchProps) {
  await translate("ES", props);
}
// raycast://extensions/EEEEEEEEEEEE/deepcast/spanish?context=%7B%22formality%22%3A%22prefer_less%22%7D&arguments=%7B%22text%22%3A%22hello%20how%20are%20you%20feeling%22%7D
//
