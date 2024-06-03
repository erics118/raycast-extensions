import { showHUD } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { getErrorMessage } from "./helpers/getError";
import { play } from "./api/play";

export default async function Command() {
  await setSpotifyClient();
  // https://open.spotify.com/playlist/4fnPlSAQMEuRw3jYySyxpf?si=5abe113992ef440a
  try {
    await play({ id: "4fnPlSAQMEuRw3jYySyxpf", type: "playlist" });
  } catch (err) {
    const error = getErrorMessage(err);
    await showHUD(error);
  }
}
